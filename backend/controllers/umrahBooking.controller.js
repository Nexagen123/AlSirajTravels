import Payment from "../models/Payment.js";
import Register from "../models/Register.js";
import UmrahPackageBooking from "../models/UmrahPackageBooking.js";
import zipAccountsService from "../services/zipAccounts.service.js";
import GroupTicketing from "../models/umrahPackgemodel.js";
import GroupTicket from "../models/GroupTicketing.js";
import { calculateBookingExpiresAt } from "../utils/bookingHoldDuration.js";
import {
  restockUmrahPackageRooms,
  reserveUmrahPackageRooms,
} from "../utils/umrahPackageInventory.js";
import { bookUmrahTNT, getTNTUser } from "../utils/Travel-Network.js";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import BookingCounter from "../models/BookingCounter.js";
import ActivityLog from "../models/activitylogs.js";
import TravelNetworkMargin from "../models/TravelNetworkMargin.js";
import FzPakistanUmrahMargin from "../models/FzPakistanUmrahMargin.js";
import FullUmrahPackageMargin from "../models/FullUmrahPackageMargin.js";
import AlAyyanUmrahMargin from "../models/AlAyyanUmrahMargin.js";
import {
  createFzPakistanUmrahBooking,
  fetchFzPakistanAdminProfile,
} from "./fzPakistan.controller.js";
import { createAlAyyanPackageBooking } from "./alAyyan.controller.js";
import { sendBookingConfirmationEmail } from "../utils/emailService.js";
import { FULL_UMRAH_PACKAGE_SOURCE } from "../utils/fullUmrahPackageApi.js";

const FZ_PAKISTAN_SOURCE = "fz-pakistan";
const AL_AYYAN_SOURCE = "al-ayyan";
const FULL_UMRAH_SUPPLIER_ACCOUNT_NAME = () =>
  getEnv("FULL_UMRAH_PACKAGE_SUPPLIER_ACCOUNT_NAME", "Full Umrah Package");
const getEnv = (key, fallback = "") => (process.env[key] || fallback).trim();
const getFzPakistanSupplierAccountName = () =>
  getEnv("FZ_PAKISTAN_SUPPLIER_ACCOUNT_NAME", "Flying Zone Travel");
const getAlAyyanSupplierAccountName = () =>
  getEnv("AL_AYYAN_SUPPLIER_ACCOUNT_NAME", "Al Ayyan");

// Al Ayyan's BookPackage endpoint expects one of these exact reservation
// type strings, keyed by our internal roomType values.
const ROOM_TYPE_TO_AL_AYYAN_RESERVATION_TYPE = {
  shared: "Sharing",
  sharing: "Sharing",
  double: "Double",
  triple: "Triple",
  quad: "Quad",
};
const toAlAyyanReservationType = (roomType) =>
  ROOM_TYPE_TO_AL_AYYAN_RESERVATION_TYPE[
    String(roomType || "")
      .trim()
      .toLowerCase()
  ] || "Double";

const parseJsonObjectField = (value, fallback = {}) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  return value && typeof value === "object" ? value : fallback;
};

const getFzPakistanRemoteCustomerId = async () => {
  const profile = await fetchFzPakistanAdminProfile();
  const customerId = profile?.id || profile?._id;
  if (!customerId) {
    throw new Error("FZ Pakistan customer account id not found in profile");
  }
  return customerId;
};

/* ===========================
   HELPER: Parse FormData fields with bracket notation
   Example: "pricing[pricePerPerson]" -> { pricing: { pricePerPerson: value }}
=========================== */
const parseFormData = (body) => {
  const parsed = {};

  for (const [key, value] of Object.entries(body)) {
    // Handle bracket notation like pricing[pricePerPerson]
    const match = key.match(/^(.+?)\[(.+?)\]$/);

    if (match) {
      const [, parentKey, childKey] = match;
      if (!parsed[parentKey]) parsed[parentKey] = {};
      parsed[parentKey][childKey] = value;
    } else {
      parsed[key] = value;
    }
  }

  return parsed;
};

/* ===========================
   HELPER: Parse passengers array from FormData
   Example: passengers[0][type] -> [{ type: value, ... }]
=========================== */
const parsePassengers = (body) => {
  // If multer/qs already parsed passengers into an array of objects, use it directly
  if (
    Array.isArray(body.passengers) &&
    body.passengers.length > 0 &&
    typeof body.passengers[0] === "object"
  ) {
    return body.passengers;
  }

  // If it's a JSON string, parse it
  if (typeof body.passengers === "string") {
    try {
      const parsed = JSON.parse(body.passengers);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
  }

  // Fallback: parse bracket notation keys manually (e.g. passengers[0][type])
  const passengersMap = {};
  for (const [key, value] of Object.entries(body)) {
    const match = key.match(/^passengers\[(\d+)\]\[(.+)\]$/);
    if (match) {
      const [, index, field] = match;
      const idx = parseInt(index, 10);
      if (!passengersMap[idx]) passengersMap[idx] = {};
      passengersMap[idx][field] = value;
    }
  }

  return Object.keys(passengersMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((idx) => passengersMap[idx]);
};

/* ===========================
   CREATE UMRAH PACKAGE BOOKING
   
   - "local-db": Locally managed packages (stored in MongoDB)
   
   Status updates work with booking data only, not package lookups.
=========================== */
export const createUmrahBooking = async (req, res) => {
  try {
    const parsedData = parseFormData(req.body);
    console.log(parsedData)
    const passengers = parsePassengers(req.body);

    // Validate passengers exist
    if (!passengers || passengers.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No passengers found in request. Please add at least one passenger.",
      });
    }

    // Parse packageData JSON if it exists
    let packageData = parseJsonObjectField(parsedData.packageData, {});

    // Generate sequential booking number
    const umrahCounter = await BookingCounter.findOneAndUpdate(
      { date: "umrah-global" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    const bookingNumber = String(umrahCounter.seq).padStart(4, "0");

    // Get pricing from parsed data
    const pricing = parsedData.pricing || {};
    const totalPassengers = passengers?.length || 0;
    const adultCount = passengers.filter((p) => p.type === "Adult").length;
    const childCount = passengers.filter((p) => p.type === "Child").length;
    const infantCount = passengers.filter((p) => p.type === "Infant").length;

    const pricePerPerson = Number(pricing.pricePerPerson) || 0;
    const adultTotal =
      Number(pricing.adultTotal) || pricePerPerson * adultCount;
    const childTotal =
      Number(pricing.childTotal) || Number(pricing.childTotal) || 0;
    const infantTotal =
      Number(pricing.infantTotal) || Number(pricing.infantTotal) || 0;

    const calculatedTotal =
      Number(pricing.totalAmount) ||
      adultTotal + childTotal + infantTotal ||
      pricePerPerson * totalPassengers ||
      0;

    // NOTE: packageTotals (and therefore pricePerPerson/calculatedTotal, which
    // derive from it) already have the incentive added in by the admin panel
    // ("Incentive is included in all room totals above"). Do NOT subtract it
    // again here — that used to cancel the incentive out entirely, silently
    // undercharging the customer by `incentive * totalPassengers`.
    const totalPrice = calculatedTotal;

    // Handle passport files
    const uploadedFiles = req.files || [];
    const fileByIndex = {};
    uploadedFiles.forEach((f) => {
      const match = f.fieldname.match(/^passportFile_(\d+)$/);
      if (match) fileByIndex[parseInt(match[1], 10)] = f.path;
    });

    const passengersWithFiles = passengers.map((passenger, index) => ({
      ...passenger,
      documentUrl: fileByIndex[index] || null,
    }));

    const bookingSource = parsedData.packageSource || "local-db";
    const expiresAt = await calculateBookingExpiresAt(
      new Date(),
      bookingSource,
    );

    const bookingData = {
      packageId: parsedData.packageId,
      packageName: parsedData.packageName,
      packageSource: parsedData.packageSource || "local-db",
      user: parsedData.user,
      roomType: parsedData.roomType,
      specialRequests: parsedData.specialRequests,
      passengers: passengersWithFiles,
      packageData: packageData,
      bookingNumber,
      pricing: {
        pricePerPerson,
        adultTotal,
        childTotal,
        infantTotal,
        currency: pricing.currency || "PKR",
        totalPrice: parseFloat(totalPrice),
      },
      paymentStatus: {
        status: "Pending",
        totalAmount: parseFloat(totalPrice),
        paidAmount: 0,
        remainingAmount: parseFloat(totalPrice),
        paymentHistory: [],
      },
      overallStatus: "On Hold",
      expiresAt,
      fzPakistanBookingStatus:
        bookingSource === FZ_PAKISTAN_SOURCE ? "pending" : "not_applicable",
      alAyyanBookingStatus:
        bookingSource === AL_AYYAN_SOURCE ? "pending" : "not_applicable",
    };

    const booking = await UmrahPackageBooking.create(bookingData);

    // Reserve rooms for local packages on booking creation
    if (bookingSource === "local-db") {
      try {
        await reserveUmrahPackageRooms(booking);
      } catch (err) {
        await UmrahPackageBooking.findByIdAndDelete(booking._id);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
    }

    // Hit Travel Network booking API if package source is travel-network
    if (parsedData.packageSource === "travel-network" && packageData) {
      try {
        const bookingUser = await Register.findById(parsedData.user).select(
          "name email phone companyName",
        );

        const tntUser = await getTNTUser();

        const tntPayload = {
          group_id:
            packageData.tnt_group_id ??
            packageData.group_id ??
            packageData.groupId ??
            null,
          package_id:
            packageData.tnt_package_id ?? packageData.package_id ?? null,
          agency_info: {
            agency_name: bookingUser?.companyName || "",
            agent_name: bookingUser?.name || "",
            created_by_id:
              tntUser?.id ?? Number(process.env.TNT_CREATED_BY_ID) ?? null,
            email: bookingUser?.email || "",
            mobile: bookingUser?.phone || "",
            adults: passengers.filter((p) => p.type === "Adult").length,
            child: passengers.filter((p) => p.type === "Child").length,
            infant: passengers.filter((p) => p.type === "Infant").length,
            agent_notes: parsedData.specialRequests || "",
          },
          booking_details: passengers.map((p) => {
            let title = p.title;

            if (p.type === "Adult") {
              const adultTitle = p.title?.toUpperCase() || "MR";
              title = ["MR", "MRS", "MS"].includes(adultTitle)
                ? adultTitle
                : "MR";
            } else if (p.type === "Child") {
              title = "CHD";
            } else if (p.type === "Infant") {
              title = "INF";
            }

            return {
              type: p.type,
              title: title,
              surname: p.surName,
              given_name: p.givenName,
              passport_no: p.passport,
              dob: p.dateOfBirth
                ? new Date(p.dateOfBirth).toISOString().split("T")[0]
                : p.dob,
              doe: p.passportExpiry
                ? new Date(p.passportExpiry).toISOString().split("T")[0]
                : p.doe,
            };
          }),
          umrah_package_price_plan: packageData.umrah_package_price_plan,
        };

        const tntResponse = await bookUmrahTNT(tntPayload);

        booking.travelNetworkBookingId =
          tntResponse?.data?.id?.toString() ||
          tntResponse?.id?.toString() ||
          null;
        booking.travelNetworkBookingRefNo =
          tntResponse?.data?.reference_no || tntResponse?.reference_no || null;
        booking.travelNetworkBookingData = tntResponse;
        booking.travelNetworkBookingCreatedAt = new Date();
        await booking.save();
      } catch (err) {
        await UmrahPackageBooking.findByIdAndDelete(booking._id);
        return res.status(400).json({
          success: false,
          message: `Travel Network booking failed: ${err.message}`,
        });
      }
    }

    // Hit FZ Pakistan booking API if package source is fz-pakistan
    if (bookingSource === FZ_PAKISTAN_SOURCE && packageData) {
      try {
        const fzMarginRecord = await FzPakistanUmrahMargin.findOne({
          type: "umrah",
        });
        const fzMarginPerPax = Math.max(
          0,
          Number(fzMarginRecord?.marginAmount) || 0,
        );

        const displayTotals = packageData?.packageTotals || {};
        const originalTotals = packageData?.originalPackageTotals || null;
        const roomTypeKeyMap = {
          double: "double",
          triple: "triple",
          quad: "quad",
          sharing: "shared",
          shared: "shared",
        };
        const roomKey = roomTypeKeyMap[booking.roomType] || booking.roomType;

        const displayAdultPrice = Math.round(
          displayTotals[roomKey] ?? pricePerPerson ?? 0,
        );
        const originalAdultPrice = Math.round(
          originalTotals?.[roomKey] ??
            Math.max(0, displayAdultPrice - fzMarginPerPax),
        );

        const displayChildPrice = Math.round(
          displayTotals.childWithoutBed ??
            displayTotals[roomKey] ??
            displayAdultPrice,
        );
        const originalChildPrice = Math.round(
          originalTotals?.childWithoutBed ??
            originalTotals?.[roomKey] ??
            Math.max(0, displayChildPrice - fzMarginPerPax),
        );

        const displayInfantPrice = Math.round(displayTotals.infant ?? 0);
        const originalInfantPrice = Math.round(
          originalTotals?.infant ??
            Math.max(0, displayInfantPrice - fzMarginPerPax),
        );

        const fzAdultTotal = originalAdultPrice * adultCount;
        const fzChildTotal = originalChildPrice * childCount;
        const fzInfantTotal = originalInfantPrice * infantCount;
        const fzTotalAmount = fzAdultTotal + fzChildTotal + fzInfantTotal;

        const fzPayload = {
          packageId: booking.packageId,
          packageName: booking.packageName,
          packageSource: "local-db",
          user: await getFzPakistanRemoteCustomerId(),
          roomType: booking.roomType,
          specialRequests: booking.specialRequests || "",
          passengers: booking.passengers.map((passenger) => ({
            type: passenger.type,
            title: passenger.title,
            givenName: passenger.givenName,
            surName: passenger.surName,
            passport: passenger.passport,
            dateOfBirth: passenger.dateOfBirth,
            passportExpiry: passenger.passportExpiry,
            nationality: passenger.nationality,
            discount: passenger.discount || 0,
          })),
          pricing: {
            pricePerPerson: originalAdultPrice,
            currency: pricing.currency || "PKR",
            incentive: Number(pricing.incentive) || 0,
            adultTotal: fzAdultTotal,
            childTotal: fzChildTotal,
            infantTotal: fzInfantTotal,
            totalAmount: fzTotalAmount,
          },
          packageData: JSON.stringify(packageData || {}),
        };

        const fzResult = await createFzPakistanUmrahBooking(fzPayload);

        if (!fzResult.success) {
          throw new Error(
            fzResult.message || "Flying Zone Umrah booking failed",
          );
        }

        booking.fzPakistanBookingId = fzResult.bookingId;
        booking.fzPakistanBookingStatus = "success";
        booking.externalBookingMessage =
          fzResult.message || "Umrah booking created on Flying Zone Pakistan";
        await booking.save();
      } catch (err) {
        await UmrahPackageBooking.findByIdAndDelete(booking._id);
        return res.status(400).json({
          success: false,
          message: `Flying Zone Umrah booking failed: ${err.message}`,
        });
      }
    }

    // Hit Al Ayyan booking API if package source is al-ayyan
    if (bookingSource === AL_AYYAN_SOURCE && packageData) {
      try {
        const alAyyanResult = await createAlAyyanPackageBooking({
          packageId: booking.packageId,
          reservationType: toAlAyyanReservationType(booking.roomType),
          passengers: booking.passengers,
        });
        console.log(alAyyanResult)


        if (!alAyyanResult.success) {
          throw new Error(
            alAyyanResult.message || "Al Ayyan Umrah booking failed",
          );
        }

        booking.alAyyanBookingId = alAyyanResult.bookingId;
        booking.alAyyanBookingStatus = "success";
        booking.externalBookingMessage =
          alAyyanResult.message || "Umrah booking created on Al Ayyan";
        await booking.save();
      } catch (err) {
        await UmrahPackageBooking.findByIdAndDelete(booking._id);
        return res.status(400).json({
          success: false,
          message: `Al Ayyan Umrah booking failed: ${err.message}`,
        });
      }
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Umrah booking "${booking.bookingNumber}" created for ${booking.passengers?.length || 0} passenger(s) - ${booking.packageName}`,
    });

    // ====== SEND BOOKING CONFIRMATION EMAIL ======
    try {
      // Get user details for email
      const bookingUser = await Register.findById(parsedData.user).select(
        "name email",
      );

      if (bookingUser && bookingUser.email) {
        await sendBookingConfirmationEmail({
          email: bookingUser.email,
          name: bookingUser.name || "Customer",
          bookingNumber: booking.bookingNumber,
          packageName: booking.packageName || "Umrah Package",
          passengers: booking.passengers || [],
          totalPrice: totalPrice,
          currency: pricing.currency || "PKR",
          bookingDate: booking.createdAt || new Date(),
        });
        console.log(
          `✅ Booking confirmation email sent to ${bookingUser.email}`,
        );
      } else {
        console.log("⚠️ No user email found, skipping email notification");
      }
    } catch (emailError) {
      // Don't fail the booking if email fails, just log the error
      console.error(
        "⚠️ Failed to send booking confirmation email:",
        emailError.message,
      );
    }

    res.status(201).json({
      success: true,
      message: "Umrah package booking created successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Create Umrah Booking Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET ALL UMRAH BOOKINGS
=========================== */
export const getAllUmrahBookings = async (req, res) => {
  try {
    const { status, user, packageId } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.overallStatus = status;
    if (user) filter.user = user;
    if (packageId) filter.packageId = packageId;

    const bookings = await UmrahPackageBooking.find(filter)
      .populate(
        "user",
        "name email phone role companyName agencyCode consultant",
      )
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Get All Umrah Bookings Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET MY BOOKINGS (USER)
=========================== */
export const getMyBookings = async (req, res) => {
  try {
    // First, get all bookings with user populated
    const bookings = await UmrahPackageBooking.find({
      user: req.user._id.toString(),
    })
      .populate(
        "user",
        "name email phone role companyName agencyCode consultant",
      )
      .lean() // Use lean for better performance
      .sort({ createdAt: -1 });

    // Separate local-db and external bookings
    const localDbBookings = bookings.filter(
      (b) => b.packageSource === "local-db",
    );

    // Get package IDs from local-db bookings
    const localPackageIds = localDbBookings
      .map((b) => b.packageId)
      .filter((id) => id); // Remove null/undefined

    // Fetch all local packages in one query
    let localPackages = [];
    if (localPackageIds.length > 0) {
      localPackages = await GroupTicketing.find({
        _id: { $in: localPackageIds },
      })
        .select(
          "packageName packageTotals flights hotels transports visa rooms days availableRooms selectedGroupTicketId",
        )
        .lean();
    }

    // Create a map for quick lookup
    const packageMap = {};
    localPackages.forEach((pkg) => {
      packageMap[pkg._id.toString()] = pkg;
    });

    // Process all bookings
    const processedBookings = bookings.map((booking) => {
      if (booking.packageSource === "local-db") {
        // Replace packageId with populated data if found
        const packageId = booking.packageId?.toString();
        if (packageId && packageMap[packageId]) {
          booking.packageId = packageMap[packageId];
        } else {
          // If not found, keep as is or set to null
          booking.packageId = booking.packageId;
        }
      } else if (booking.packageSource === "travel-network") {
        // Keep the packageId as is for external packages
        booking.isExternalPackage = true;
        booking.externalSource = "travel-network";
      } else if (
        booking.packageSource === FZ_PAKISTAN_SOURCE ||
        booking.packageSource === FULL_UMRAH_PACKAGE_SOURCE ||
        booking.packageSource === AL_AYYAN_SOURCE
      ) {
        booking.isExternalPackage = true;
        booking.externalSource = booking.packageSource;
      }

      return booking;
    });

    res.status(200).json({
      success: true,
      count: processedBookings.length,
      data: processedBookings,
    });
  } catch (error) {
    console.error("Get My Bookings Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET ALL BOOKINGS (ADMIN ONLY)
=========================== */
export const getAllBookingsAdmin = async (req, res) => {
  try {
    const { status, user, packageId, search } = req.query;
    // Build filter
    const filter = {};
    if (status) filter.overallStatus = status;
    if (user) filter.user = user;
    if (packageId) filter.packageId = packageId;
    if (search) {
      filter.$or = [
        { bookingNumber: { $regex: search, $options: "i" } },
        { packageName: { $regex: search, $options: "i" } },
      ];
    }

    // Get all bookings with user populated first
    let bookings = await UmrahPackageBooking.find(filter)
      .populate(
        "user",
        "name email phone role companyName agencyCode consultant",
      )
      .lean() // Use lean for better performance
      .sort({ createdAt: -1 });

    // Separate local-db and external bookings
    const localDbBookings = bookings.filter(
      (b) => b.packageSource === "local-db",
    );

    // Get package IDs from local-db bookings
    const localPackageIds = localDbBookings
      .map((b) => b.packageId)
      .filter((id) => id); // Remove null/undefined

    // Fetch all local packages in one query
    let localPackages = [];
    if (localPackageIds.length > 0) {
      localPackages = await GroupTicketing.find({
        _id: { $in: localPackageIds },
      })
        .select(
          "packageName packageTotals flights hotels transports visa rooms days availableRooms selectedGroupTicketId",
        )
        .lean();
    }

    // Create a map for quick lookup
    const packageMap = {};
    localPackages.forEach((pkg) => {
      packageMap[pkg._id.toString()] = pkg;
    });

    // Process all bookings
    const processedBookings = bookings.map((booking) => {
      if (booking.packageSource === "local-db") {
        // Replace packageId with populated data if found
        const packageId = booking.packageId?.toString();
        if (packageId && packageMap[packageId]) {
          booking.packageId = packageMap[packageId];
        } else {
          // If not found, keep as is or set to null
          booking.packageId = booking.packageId;
        }
      } else if (booking.packageSource === "travel-network") {
        // Keep the packageId as is for external packages
        booking.isExternalPackage = true;
        booking.externalSource = "travel-network";
        // Optionally, you could add a note that this package comes from external source
        booking._externalPackageNote =
          "This package is from travel network. Please fetch details from external API.";
      } else if (
        booking.packageSource === FZ_PAKISTAN_SOURCE ||
        booking.packageSource === FULL_UMRAH_PACKAGE_SOURCE ||
        booking.packageSource === AL_AYYAN_SOURCE
      ) {
        booking.isExternalPackage = true;
        booking.externalSource = booking.packageSource;
        booking._externalPackageNote = `This package is from ${
          booking.packageSource === FULL_UMRAH_PACKAGE_SOURCE
            ? "Full Umrah Package"
            : booking.packageSource === AL_AYYAN_SOURCE
              ? "Al Ayyan"
              : "Flying Zone Pakistan"
        }. Details are stored from the external booking payload.`;
      }

      return booking;
    });

    res.status(200).json({
      success: true,
      count: processedBookings.length,
      data: processedBookings,
    });
  } catch (error) {
    console.error("Get All Bookings Admin Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET SINGLE UMRAH BOOKING BY ID
=========================== */
export const getUmrahBookingById = async (req, res) => {
  try {
    console.log("hit");
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Get Umrah Booking Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE UMRAH BOOKING
=========================== */
export const updateUmrahBooking = async (req, res) => {
  try {
    // If updating passengers, recalculate total price
    if (req.body.passengers || req.body.pricing?.pricePerPerson) {
      const booking = await UmrahPackageBooking.findById(req.params.id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Umrah booking not found",
        });
      }

      const passengers = req.body.passengers || booking.passengers;
      const pricePerPerson =
        req.body.pricing?.pricePerPerson || booking.pricing.pricePerPerson;
      const totalPrice = pricePerPerson * passengers.length;

      req.body.pricing = {
        ...booking.pricing,
        ...req.body.pricing,
        totalPrice,
      };

      // Update payment status total amount if needed
      if (req.body.paymentStatus) {
        req.body.paymentStatus.totalAmount = totalPrice;
      } else {
        req.body.paymentStatus = {
          ...booking.paymentStatus,
          totalAmount: totalPrice,
        };
      }
    }

    const booking = await UmrahPackageBooking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Umrah booking "${booking.bookingNumber}" updated`,
    });

    res.status(200).json({
      success: true,
      message: "Umrah booking updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Umrah Booking Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   DELETE UMRAH BOOKING
=========================== */
export const deleteUmrahBooking = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      description: `Umrah booking "${booking.bookingNumber}" deleted`,
    });

    res.status(200).json({
      success: true,
      message: "Umrah booking deleted successfully",
    });
  } catch (error) {
    console.error("Delete Umrah Booking Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   SUBMIT PAYMENT (AGENT/USER)
   Agent/User submits payment - MUST be full amount
=========================== */
export const submitPayment = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    // Verify user owns this booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only submit payments for your own bookings",
      });
    }

    if (booking.overallStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "This booking is cancelled and cannot accept payments",
      });
    }

    if (
      ["On Hold", "Pending"].includes(booking.overallStatus) &&
      booking.expiresAt &&
      booking.expiresAt <= new Date()
    ) {
      booking.overallStatus = "Cancelled";
      booking.expiresAt = null;
      await restockUmrahPackageRooms(booking);
      await booking.save();

      return res.status(400).json({
        success: false,
        message: "This booking hold has expired",
      });
    }

    // Allow multiple payments - only check if there's a pending payment
    const hasPendingPayment = booking.paymentStatus.paymentHistory?.some(
      (payment) => payment.paymentStatus === "Pending",
    );

    if (hasPendingPayment) {
      return res.status(400).json({
        success: false,
        message:
          "Please wait for current payment to be reviewed before submitting another",
      });
    }

    const { amount, method, receiptNumber, notes, bankAccountId } = req.body;

    if (!amount || !method) {
      return res.status(400).json({
        success: false,
        message: "Amount and payment method are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Receipt file is required",
      });
    }

    const submittedAmount = parseFloat(amount);
    const remainingAmount = booking.paymentStatus.remainingAmount;

    // Allow partial or full payments (up to remaining amount)
    if (submittedAmount > remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount cannot exceed remaining amount of PKR ${remainingAmount.toLocaleString()}`,
      });
    }

    if (submittedAmount < 1) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be at least PKR 1",
      });
    }

    // Create new payment history item
    const newPayment = {
      amount: submittedAmount,
      method: method,
      paymentDate: new Date(),
      receiptNumber: receiptNumber || "",
      receiptFile: req.file.path, // Cloudinary URL
      notes: notes || "",
      paymentStatus: "Pending", // Admin needs to review
      submittedBy: req.user._id.toString(),
      bank: bankAccountId,
    };

    // Add to payment history
    if (!booking.paymentStatus.paymentHistory) {
      booking.paymentStatus.paymentHistory = [];
    }
    booking.paymentStatus.paymentHistory.push(newPayment);

    // Update overall payment status to Pending
    booking.paymentStatus.status = "Pending";

    await booking.save();

    // Now create a payment voucher entry for ledger hitting
    // Now create a payment voucher entry for ledger hitting
    const paymentVoucher = await Payment.create({
      umrahPkgBooking: booking._id,
      booking: null,

      user: booking.user,

      amount: submittedAmount,

      status: "Un Posted",

      date: new Date(),

      description: `Payment for Umrah Package Booking: ${booking.bookingNumber} - ${booking.packageName}`,

      // Receipt
      receipt: req.file.path,
      receiptPublicId: req.file.filename || null,

      // Optional Fields
      remarks: notes || "",

      // Optional custom fields
      paymentMethod: method,
      referenceNumber: receiptNumber || "",

      // If bank account exists
      bankAccount: booking.bankAccount || null,
    });

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Payment of ${submittedAmount} submitted for Umrah booking "${booking.bookingNumber}"`,
    });

    res.status(200).json({
      success: true,
      message: "Payment submitted successfully. Waiting for admin review.",
      data: booking,
    });
  } catch (error) {
    console.error("Submit Payment Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   REVIEW PAYMENT (ADMIN ONLY)
   Admin reviews single payment and updates status
   
   NOTE: This function works with booking data only.
   No package lookup required - booking stores all needed info.
=========================== */
export const reviewPayment = async (req, res) => {
  try {
    const { paymentId } = req.params; // This is actually bookingId now
    const { paymentStatus, rejectionReason } = req.body;

    // Find booking by ID
    const booking = await UmrahPackageBooking.findById(paymentId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if payment has been submitted (check payment history)
    const pendingPayment = booking.paymentStatus.paymentHistory?.find(
      (payment) => payment.paymentStatus === "Pending",
    );

    if (!pendingPayment) {
      return res.status(400).json({
        success: false,
        message: "No pending payment found for this booking",
      });
    }

    // Validate status
    if (!["Pending", "Approved", "Rejected"].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    // Check rejection reason if status is Rejected
    if (paymentStatus === "Rejected" && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required when rejecting payment",
      });
    }

    // Update the pending payment in history
    pendingPayment.paymentStatus = paymentStatus;
    pendingPayment.reviewedBy = req.user._id.toString();
    pendingPayment.reviewedAt = new Date();

    if (paymentStatus === "Rejected") {
      pendingPayment.rejectionReason = rejectionReason;
      // Reset overall status back to On Hold if payment rejected
      booking.overallStatus = "On Hold";
      const bookingSource = booking.packageSource || "local-db";
      booking.expiresAt = await calculateBookingExpiresAt(
        new Date(),
        bookingSource,
      );
      booking.paymentStatus.status = "Pending";
    }

    // If approved, add proof file and update overall status
    if (paymentStatus === "Approved") {
      if (req.file) {
        pendingPayment.approvalProofFile = req.file.path; // Cloudinary URL
      }

      // Update paid amount and remaining amount
      booking.paymentStatus.paidAmount += pendingPayment.amount;
      booking.paymentStatus.remainingAmount =
        booking.paymentStatus.totalAmount - booking.paymentStatus.paidAmount;

      // Update overall payment status to Approved (always, even if partial)
      booking.paymentStatus.status = "Approved";

      // Update overall booking status to In Progress when payment approved
      if (["On Hold", "Pending"].includes(booking.overallStatus)) {
        booking.overallStatus = "In Progress";
      }

      booking.expiresAt = null;

      // update the payment voucher with status posted
      await Payment.updateOne(
        { umrahPkgBooking: booking._id, status: "Un Posted" },
        { status: "Posted" },
      );

      // =========================
      // ZIP ACCOUNT LEDGER ENTRY
      // =========================

      // Get user
      const user = await Register.findById(booking.user);

      if (!user?.zipId) {
        throw new Error("User ZIP account ID not found");
      }

      // Get bank ID from payment history item
      const bankAccountId = pendingPayment.bank;

      if (!bankAccountId) {
        throw new Error("Bank account not found in payment");
      }

      const customerAccountId = user.zipId;

      const amount = pendingPayment.amount;

      const date = new Date().toISOString().split("T")[0];

      const description = `Umrah Payment - ${booking.bookingNumber} - ${booking.packageName}`;

      const rows = [
        // BANK DEBIT
        {
          account: bankAccountId,
          debit: amount,
          credit: 0,
          description,
        },

        // CUSTOMER CREDIT
        {
          account: customerAccountId,
          debit: 0,
          credit: amount,
          description,
        },
      ];

      const voucherData = {
        type: "journalPortal",
        date,
        transactions: rows.map((txn, index) => ({
          metadata: { id: index },
          account: txn.account,
          description: txn.description,
          credit: txn.credit,
          debit: txn.debit,
        })),
      };

      // Create ZIP voucher
      const response = await zipAccountsService.createVoucher(voucherData);
    }

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Payment ${paymentStatus.toLowerCase()} for Umrah booking "${booking.bookingNumber}"`,
    });

    res.status(200).json({
      success: true,
      message: `Payment ${paymentStatus.toLowerCase()} successfully`,
      data: booking,
    });
  } catch (error) {
    console.error("Review Payment Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE VISA STATUS
   
   NOTE: This function works with booking data only.
   No package lookup required - booking stores all needed info.
   Visa can be updated anytime (no payment dependency).
=========================== */
export const updateVisaStatus = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    // No payment dependency - visa can be updated anytime

    const updateData = {
      ...booking.visaStatus,
      ...req.body,
    };

    // Add approval document if file uploaded
    if (req.file) {
      updateData.approvalDocument = req.file.path; // Cloudinary URL
    }

    booking.visaStatus = updateData;

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Visa status updated to "${booking.visaStatus?.status}" for Umrah booking "${booking.bookingNumber}"`,
    });

    res.status(200).json({
      success: true,
      message: "Visa status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Visa Status Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE HOTEL STATUS
=========================== */
/* ===========================
   UPDATE HOTEL STATUS
   
   NOTE: This function works with booking data only.
   No package lookup required - booking stores all needed info.
   Checks visa dependency before allowing hotel updates.
=========================== */
export const updateHotelStatus = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    // const linkedPackage = await GroupTicketing.findById(booking.packageId);

    // if (!linkedPackage) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Linked package not found",
    //   });
    // }

    // =========================================
    // VISA MUST BE APPROVED FIRST
    // =========================================

    if (booking.visaStatus.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Cannot update hotel status. Visa must be approved first.",
      });
    }

    // =========================================
    // UPDATE HOTEL STATUS
    // =========================================

    const updateData = {
      ...booking.hotelStatus,
      ...req.body,
    };

    if (req.file) {
      updateData.confirmationDocument = req.file.path;
    }

    booking.hotelStatus = updateData;

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Hotel status updated to "${booking.hotelStatus?.status}" for Umrah booking "${booking.bookingNumber}"`,
    });

    return res.status(200).json({
      success: true,
      message: "Hotel status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Hotel Status Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE VOUCHER STATUS
=========================== */
export const updateVoucherStatus = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    booking.voucherStatus = {
      ...booking.voucherStatus,
      ...req.body,
    };

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Voucher status updated for Umrah booking "${booking.bookingNumber}"`,
    });

    res.status(200).json({
      success: true,
      message: "Voucher status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Voucher Status Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   EXTEND UMRAH BOOKING HOLD
=========================== */
export const extendUmrahBookingHold = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id).populate(
      "user",
      "name email phone role companyName agencyCode consultant",
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    if (!["On Hold", "Pending"].includes(booking.overallStatus)) {
      return res.status(400).json({
        success: false,
        message: "Only on-hold Umrah bookings can be extended",
      });
    }

    const holdMinutes = Number(req.body.holdMinutes);
    if (!Number.isFinite(holdMinutes) || holdMinutes <= 0) {
      return res.status(400).json({
        success: false,
        message: "Hold duration must be greater than zero",
      });
    }

    booking.overallStatus = "On Hold";
    booking.expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Umrah booking "${booking.bookingNumber}" hold extended by ${holdMinutes} minute(s)`,
    });

    res.status(200).json({
      success: true,
      message: "Umrah booking hold updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Extend Umrah Booking Hold Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE OVERALL STATUS
   get linked package whose booking was made
   hit on zip accounts ledger entries (multiple entries for all pax)
   all hotel , visa , ticket , transport supplier are credited
   customer is debited
   umrah income is debited or credited
=========================== */
export const updateOverallStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    const oldStatus = booking.overallStatus;

    // =========================================
    // DETERMINE BOOKING SOURCE
    // =========================================
    const packageSource = booking.packageSource || "local-db";
    const isTravelNetwork = packageSource === "travel-network";
    const isFzPakistanPackage = packageSource === FZ_PAKISTAN_SOURCE;
    const isFullUmrahPackage = packageSource === FULL_UMRAH_PACKAGE_SOURCE;
    const isAlAyyanPackage = packageSource === AL_AYYAN_SOURCE;
    const isExternalPackage =
      isTravelNetwork ||
      isFzPakistanPackage ||
      isFullUmrahPackage ||
      isAlAyyanPackage;

    // =========================================
    // GET LINKED PACKAGE (only for non-travel-network bookings)
    // =========================================
    const linkedPackage = isExternalPackage
      ? booking.packageData || null
      : await GroupTicketing.findById(booking.packageId);

    if (!isExternalPackage && !linkedPackage) {
      return res.status(404).json({
        success: false,
        message: "Linked package not found",
      });
    }

    // Reopening a cancelled booking should reserve inventory before any new
    // ledger voucher is created.
    // if (oldStatus === "Cancelled" && status !== "Cancelled") {
    //   await reserveUmrahPackageRooms(booking);
    // }

    // =========================================
    // CREATE VOUCHER WHEN STATUS CHANGES TO "Confirmed"
    // =========================================
    if (oldStatus !== "Confirmed" && status === "Confirmed") {
      // =========================================
      // CUSTOMER ACCOUNT
      // =========================================
      const user = await Register.findById(booking.user);

      if (!user?.zipId) {
        throw new Error("User ZIP account ID not found");
      }

      const customerAccountId = user.zipId;

      // =========================================
      // FETCH ZIP ACCOUNTS
      // =========================================
      const accountsData = await zipAccountsService.getAllAccounts();
      const accounts = Array.isArray(accountsData)
        ? accountsData
        : accountsData.results || [];

      // =========================================
      // FIND UMRAH INCOME ACCOUNT
      // =========================================
      const umrahIncomeAcc = accounts.find(
        (acc) => acc.account_name === "Umrah Income",
      );

      if (!umrahIncomeAcc) {
        throw new Error('"Umrah Income" account not found');
      }

      const umrahIncomeAccountId = umrahIncomeAcc._id;

      // =========================================
      // TRAVEL NETWORK: SIMPLIFIED VOUCHER
      // Customer is DEBITED with their type-specific selling price (with margin)
      // Travel Network supplier is CREDITED with the original price (without margin)
      // Margin + any supplier discount → Umrah Income
      // =========================================
      if (isFzPakistanPackage || isFullUmrahPackage || isAlAyyanPackage) {
        const supplierAccountName = isFzPakistanPackage
          ? getFzPakistanSupplierAccountName()
          : isAlAyyanPackage
            ? getAlAyyanSupplierAccountName()
            : FULL_UMRAH_SUPPLIER_ACCOUNT_NAME();
        const supplierLabel = isFzPakistanPackage
          ? "Flying Zone Pakistan"
          : isAlAyyanPackage
            ? "Al Ayyan"
            : "Full Umrah Package";
        const fzPakistanAcc = accounts.find(
          (acc) => acc.account_name === supplierAccountName,
        );

        if (!fzPakistanAcc) {
          throw new Error(
            `"${supplierAccountName}" supplier account not found in ZIP Accounts`,
          );
        }

        const fzPakistanAccountId = fzPakistanAcc._id;
        const supplierDiscount = Math.max(
          0,
          Number(req.body.supplierDiscount) || 0,
        );

        // Persist the supplier discount on the booking document
        booking.supplierDiscount = supplierDiscount;

        const packageData = booking.packageData || {};
        const roomType = booking.roomType || "sharing";
        const roomTypeKeyMap = {
          double: "double",
          triple: "triple",
          quad: "quad",
          sharing: "shared",
          shared: "shared",
        };
        const roomKey = roomTypeKeyMap[roomType] || roomType;

        // Fetch the stored margin so we know how much we added on top of each price
        const fzMarginRecord = isFzPakistanPackage
          ? await FzPakistanUmrahMargin.findOne({ type: "umrah" })
          : isFullUmrahPackage
            ? await FullUmrahPackageMargin.findOne({ type: "umrah" })
            : isAlAyyanPackage
              ? await AlAyyanUmrahMargin.findOne({ type: "umrah" })
              : null;
        const fzMarginPerPax = Math.max(
          0,
          Number(fzMarginRecord?.marginAmount) || 0,
        );

        // ─── Resolve per-type SELLING prices (WITH margin, what customer pays) ─────
        // packageData.packageTotals stores the margin-applied prices (display prices)
        // packageData.originalPackageTotals stores Flying Zone's net prices (without our margin)
        const displayTotals = packageData.packageTotals || {};
        const originalTotals = packageData.originalPackageTotals || {};
        const incentive = Number(displayTotals.incentive) || 0;

        // displayTotals already has the incentive added in (admin panel: "Incentive
        // is included in all room totals above") — that IS the price the customer
        // agreed to pay, so it must NOT be subtracted again here.
        const adultSellingPrice = Math.round(
          displayTotals[roomKey] || booking.pricing?.pricePerPerson || 0,
        );
        const childSellingPrice = Math.round(
          displayTotals.childWithoutBed ||
            displayTotals[roomKey] ||
            adultSellingPrice,
        );
        const infantSellingPrice = Math.round(displayTotals.infant || 0);

        // Original Flying Zone net prices per pax type (without our margin AND
        // without our promotional incentive, since the incentive is our own
        // markup, not something the supplier is owed for) — used for SUPPLIER CREDIT
        const adultOriginalPrice = Math.round(
          originalTotals[roomKey] ||
            Math.max(0, adultSellingPrice - incentive - fzMarginPerPax),
        );
        const childOriginalPrice = Math.round(
          originalTotals.childWithoutBed ||
            originalTotals[roomKey] ||
            Math.max(0, childSellingPrice - incentive - fzMarginPerPax),
        );
        const infantOriginalPrice = Math.round(
          originalTotals.infant ||
            Math.max(0, infantSellingPrice - incentive - fzMarginPerPax),
        );

        const getSellingPrice = (type) => {
          if (type === "Child") return childSellingPrice;
          if (type === "Infant") return infantSellingPrice;
          return adultSellingPrice;
        };

        const getOriginalPrice = (type) => {
          if (type === "Child") return childOriginalPrice;
          if (type === "Infant") return infantOriginalPrice;
          return adultOriginalPrice;
        };

        const passengers = booking.passengers || [];
        const rows = [];
        let totalSellingPrice = 0; // what customer pays (with margin)
        let totalSupplierCost = 0; // what we owe Flying Zone (without margin)

        passengers.forEach((pax) => {
          const paxName =
            `${pax.title || ""} ${pax.givenName || ""} ${pax.surName || ""}`.trim();
          const sellingPrice = getSellingPrice(pax.type);
          const discount = Math.max(0, Number(pax.discount) || 0);
          const debitAmount = Math.max(0, sellingPrice - discount);
          totalSellingPrice += debitAmount;

          rows.push({
            account: customerAccountId,
            debit: debitAmount,
            credit: 0,
            description: `Umrah Package (${supplierLabel}), ${paxName} (${pax.type}) - ${booking.bookingNumber}`,
          });

          // Supplier cost = original Flying Zone price (without our margin).
          // Pax-level discount is ours to give — it comes out of our margin/profit,
          // not the supplier's cut, so it must NOT reduce the supplier amount.
          const originalPrice = getOriginalPrice(pax.type);
          const supplierAmount = Math.max(0, originalPrice);
          totalSupplierCost += supplierAmount;
        });

        // Apply the supplier-level discount (admin-entered) on top of the per-pax discounts
        // This reduces what we credit to Flying Zone
        const finalSupplierCost = Math.max(
          0,
          totalSupplierCost - supplierDiscount,
        );

        // FLYING ZONE SUPPLIER CREDIT (original FZ price — without our margin — minus supplier discount)
        if (finalSupplierCost > 0) {
          rows.push({
            account: fzPakistanAccountId,
            debit: 0,
            credit: finalSupplierCost,
            description: `${supplierLabel} Umrah Expense - ${booking.bookingNumber}`,
          });
        }

        const profitOrLoss = totalSellingPrice - finalSupplierCost;

        if (profitOrLoss > 0) {
          rows.push({
            account: umrahIncomeAccountId,
            debit: 0,
            credit: profitOrLoss,
            description: `Umrah Profit (${supplierLabel}) - ${booking.bookingNumber}`,
          });
        }

        if (profitOrLoss < 0) {
          rows.push({
            account: umrahIncomeAccountId,
            debit: Math.abs(profitOrLoss),
            credit: 0,
            description: `Umrah Loss (${supplierLabel}) - ${booking.bookingNumber}`,
          });
        }

        const totalDebit = rows.reduce((sum, row) => sum + (row.debit || 0), 0);
        const totalCredit = rows.reduce(
          (sum, row) => sum + (row.credit || 0),
          0,
        );

        if (totalDebit !== totalCredit) {
          throw new Error(
            `Voucher is unbalanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
          );
        }

        const voucherData = {
          type: "journalPortal",
          date: new Date().toISOString().split("T")[0],
          transactions: rows.map((txn, index) => ({
            metadata: { id: index },
            account: txn.account,
            description: txn.description,
            debit: txn.debit,
            credit: txn.credit,
          })),
        };

        const response = await zipAccountsService.createVoucher(voucherData);

        const createdVoucherId = response?.newVoucher?._id;
        if (createdVoucherId) {
          booking.voucherStatus = booking.voucherStatus || {};
          booking.voucherStatus.zipVoucherId = String(createdVoucherId);
          booking.voucherStatus.zipVoucherCreatedAt = new Date();
        }
      } else if (isTravelNetwork) {
        const travelNetworkAcc = accounts.find(
          (acc) => acc.account_name === "Travel Network",
        );

        if (!travelNetworkAcc) {
          throw new Error(
            '"Travel Network" supplier account not found in ZIP Accounts',
          );
        }

        const travelNetworkAccountId = travelNetworkAcc._id;
        const supplierDiscount = Math.max(
          0,
          Number(req.body.supplierDiscount) || 0,
        );

        // Persist the supplier discount on the booking document
        booking.supplierDiscount = supplierDiscount;

        // Fetch the stored margin so we know how much we added on top of each price
        const marginRecord = await TravelNetworkMargin.findOne({
          type: "umrah",
        });
        const marginPerPax = Math.max(
          0,
          Number(marginRecord?.marginAmount) || 0,
        );

        // ─── Resolve per-type SELLING prices (WITH margin, what customer pays) ─────
        // packageData.packageTotals stores the margin-applied prices (display prices)
        // packageData.originalPackageTotals stores TNT net prices (without our margin)
        const packageData = booking.packageData || {};
        const displayTotals = packageData.packageTotals || {}; // with margin
        const originalTotals = packageData.originalPackageTotals || {}; // without margin
        const roomType = booking.roomType || "sharing";

        // Map roomType → key in packageTotals
        const roomTypeKeyMap = {
          double: "double",
          triple: "triple",
          quad: "quad",
          sharing: "shared",
          shared: "shared",
        };
        const roomKey = roomTypeKeyMap[roomType] || roomType;

        // Selling prices per pax type (with margin) — used for CUSTOMER DEBIT
        const adultSellingPrice = Math.round(
          displayTotals[roomKey] || booking.pricing?.pricePerPerson || 0,
        );
        const childSellingPrice = Math.round(
          displayTotals.childWithoutBed ||
            displayTotals[roomKey] ||
            adultSellingPrice,
        );
        const infantSellingPrice = Math.round(displayTotals.infant || 0);

        // Original TNT net prices per pax type (without our margin) — used for SUPPLIER CREDIT
        const adultOriginalPrice = Math.round(
          originalTotals[roomKey] ||
            Math.max(0, adultSellingPrice - marginPerPax),
        );
        const childOriginalPrice = Math.round(
          originalTotals.childWithoutBed ||
            originalTotals[roomKey] ||
            Math.max(0, childSellingPrice - marginPerPax),
        );
        const infantOriginalPrice = Math.round(
          originalTotals.infant || infantSellingPrice,
        ); // infant usually has no margin

        const getSellingPrice = (type) => {
          if (type === "Child") return childSellingPrice;
          if (type === "Infant") return infantSellingPrice;
          return adultSellingPrice;
        };

        const getOriginalPrice = (type) => {
          if (type === "Child") return childOriginalPrice;
          if (type === "Infant") return infantOriginalPrice;
          return adultOriginalPrice;
        };

        const passengers = booking.passengers || [];
        const rows = [];
        let totalSellingPrice = 0; // what customer pays (with margin)
        let totalSupplierCost = 0; // what we owe Travel Network (without margin)

        // CUSTOMER DEBIT — ONE ROW PER PAX with correct type-specific price
        passengers.forEach((pax) => {
          const paxName =
            `${pax.title || ""} ${pax.givenName || ""} ${pax.surName || ""}`.trim();
          const description = `Umrah Package (Travel Network), ${paxName} (${pax.type}) - ${booking.bookingNumber}`;

          const sellingPrice = getSellingPrice(pax.type);
          const discount = Math.max(0, Number(pax.discount) || 0);
          const debitAmount = Math.max(0, sellingPrice - discount);
          totalSellingPrice += debitAmount;

          rows.push({
            account: customerAccountId,
            debit: debitAmount,
            credit: 0,
            description,
          });

          // Supplier cost = original TNT price (without our margin).
          // Pax-level discount is ours to give — it comes out of our margin/profit,
          // not the supplier's cut, so it must NOT reduce the supplier amount.
          const originalPrice = getOriginalPrice(pax.type);
          const supplierAmount = Math.max(0, originalPrice);
          totalSupplierCost += supplierAmount;
        });

        // Apply the supplier-level discount (admin-entered) on top of the per-pax discounts
        // This reduces what we credit to Travel Network
        const finalSupplierCost = Math.max(
          0,
          totalSupplierCost - supplierDiscount,
        );

        // TRAVEL NETWORK SUPPLIER CREDIT (original TNT price — without our margin — minus supplier discount)
        if (finalSupplierCost > 0) {
          rows.push({
            account: travelNetworkAccountId,
            debit: 0,
            credit: finalSupplierCost,
            description: `Travel Network Expense - ${booking.bookingNumber}`,
          });
        }

        // PROFIT ENTRY = our margin + supplier discount (total we keep)
        const profitOrLoss = totalSellingPrice - finalSupplierCost;

        if (profitOrLoss > 0) {
          rows.push({
            account: umrahIncomeAccountId,
            debit: 0,
            credit: profitOrLoss,
            description: `Umrah Profit (Travel Network) - ${booking.bookingNumber}`,
          });
        }

        if (profitOrLoss < 0) {
          rows.push({
            account: umrahIncomeAccountId,
            debit: Math.abs(profitOrLoss),
            credit: 0,
            description: `Umrah Loss (Travel Network) - ${booking.bookingNumber}`,
          });
        }

        // BALANCE CHECK
        const totalDebit = rows.reduce((sum, row) => sum + (row.debit || 0), 0);
        const totalCredit = rows.reduce(
          (sum, row) => sum + (row.credit || 0),
          0,
        );

        if (totalDebit !== totalCredit) {
          throw new Error(
            `Voucher is unbalanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
          );
        }

        // CREATE ZIP VOUCHER
        const voucherData = {
          type: "journalPortal",
          date: new Date().toISOString().split("T")[0],
          transactions: rows.map((txn, index) => ({
            metadata: { id: index },
            account: txn.account,
            description: txn.description,
            debit: txn.debit,
            credit: txn.credit,
          })),
        };

        const response = await zipAccountsService.createVoucher(voucherData);

        const createdVoucherId = response?.newVoucher?._id;
        if (createdVoucherId) {
          booking.voucherStatus = booking.voucherStatus || {};
          booking.voucherStatus.zipVoucherId = String(createdVoucherId);
          booking.voucherStatus.zipVoucherCreatedAt = new Date();
        }
      } else {
        // =========================================
        // LOCAL-DB: FULL COST BREAKDOWN VOUCHER
        // =========================================

        // =========================================
        // SELLING PRICES (from packageTotals — incentive is already included
        // in each room total by the admin panel, so it must NOT be deducted
        // again here; that used to cancel the incentive out entirely)
        // =========================================
        const packageTotals = linkedPackage.packageTotals || {};

        const roomTypeKeyMap = {
          double: "double",
          triple: "triple",
          quad: "quad",
          sharing: "shared",
        };
        const roomKey = roomTypeKeyMap[booking.roomType] || booking.roomType;

        const adultSellingPerPax = Math.round(packageTotals[roomKey] || 0);
        const childSellingPerPax = Math.round(
          packageTotals.childWithoutBed || 0,
        );
        const infantSellingPerPax = Math.round(packageTotals.infant || 0);

        const getSellingPrice = (type) => {
          if (type === "Child") return childSellingPerPax;
          if (type === "Infant") return infantSellingPerPax;
          return adultSellingPerPax;
        };

        // =========================================
        // FLIGHT INFO FOR DESCRIPTION
        // =========================================
        const firstFlight = linkedPackage.flights?.[0] || {};
        const travelDate = firstFlight.depDate
          ? new Date(firstFlight.depDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "N/A";
        const sector =
          firstFlight.sectorFrom && firstFlight.sectorTo
            ? `${firstFlight.sectorFrom}-${firstFlight.sectorTo}`
            : "N/A";

        let pnr = "N/A";
        if (linkedPackage.selectedGroupTicketId) {
          const ticketForPnr = await GroupTicket.findById(
            linkedPackage.selectedGroupTicketId,
          ).select("pnr");
          if (ticketForPnr?.pnr) pnr = ticketForPnr.pnr;
        }

        // =========================================
        // CALCULATIONS & BUILD VOUCHER ROWS
        // =========================================
        const passengers = booking.passengers || [];
        let totalSellingPrice = 0;
        let totalCost = 0;
        const rows = [];

        // CUSTOMER DEBIT — ONE ROW PER PAX
        passengers.forEach((pax) => {
          const paxName =
            `${pax.title || ""} ${pax.givenName || ""} ${pax.surName || ""}`.trim();
          const description = `Umrah Package, ${paxName} (${pax.type}), ${travelDate}, ${pnr} & ${sector}`;
          const baseSellingPrice = getSellingPrice(pax.type);
          const discount = Math.max(0, Number(pax.discount) || 0);
          const debitAmount = Math.max(0, baseSellingPrice - discount);
          totalSellingPrice += debitAmount;

          rows.push({
            account: customerAccountId,
            debit: debitAmount,
            credit: 0,
            description,
          });
        });

        // VISA CREDIT ENTRIES — ONE ROW PER PAX
        if (linkedPackage.visa) {
          const visaSupplierId = linkedPackage.visa?.supplier?._id;
          const visaCostPerPax = Math.round(
            (linkedPackage.visa.buyingPrice || 0) *
              (linkedPackage.visa.buyingRoe || 1),
          );

          if (visaSupplierId && visaCostPerPax > 0) {
            passengers.forEach((pax) => {
              const paxName =
                `${pax.title || ""} ${pax.givenName || ""} ${pax.surName || ""}`.trim();
              totalCost += visaCostPerPax;
              rows.push({
                account: visaSupplierId,
                debit: 0,
                credit: visaCostPerPax,
                description: `Visa Expense - ${paxName} (${pax.type}) - ${booking.bookingNumber}`,
              });
            });
          }
        }

        // HOTEL CREDIT ENTRIES — ONE ROW PER ADULT PAX ONLY
        if (Array.isArray(linkedPackage.hotels)) {
          const adultPassengers = passengers.filter((p) => p.type === "Adult");

          linkedPackage.hotels.forEach((hotel) => {
            const supplierId = hotel?.supplier?._id;
            let hotelCostPerPax = 0;
            const nightCount = hotel.nightCount || hotel.nights || 0;

            switch (booking.roomType) {
              case "double":
                hotelCostPerPax = Math.round(
                  (hotel.doubleRoom?.buyingPrice || 0) *
                    (hotel.doubleRoom?.buyingRoe || 1) *
                    nightCount,
                );
                break;
              case "triple":
                hotelCostPerPax = Math.round(
                  (hotel.tripleRoom?.buyingPrice || 0) *
                    (hotel.tripleRoom?.buyingRoe || 1) *
                    nightCount,
                );
                break;
              case "quad":
                hotelCostPerPax = Math.round(
                  (hotel.quadRoom?.buyingPrice || 0) *
                    (hotel.quadRoom?.buyingRoe || 1) *
                    nightCount,
                );
                break;
              case "sharing":
                hotelCostPerPax = Math.round(
                  (hotel.sharedRoom?.buyingPrice || 0) *
                    (hotel.sharedRoom?.buyingRoe || 1) *
                    nightCount,
                );
                break;
              default:
                hotelCostPerPax = 0;
            }

            if (supplierId && hotelCostPerPax > 0) {
              adultPassengers.forEach((pax) => {
                const paxName =
                  `${pax.title || ""} ${pax.givenName || ""} ${pax.surName || ""}`.trim();
                totalCost += hotelCostPerPax;
                rows.push({
                  account: supplierId,
                  debit: 0,
                  credit: hotelCostPerPax,
                  description: `Hotel Expense - ${hotel.name} - ${paxName} - ${booking.bookingNumber}`,
                });
              });
            }
          });
        }

        // TRANSPORT CREDIT ENTRIES
        if (Array.isArray(linkedPackage.transports)) {
          linkedPackage.transports.forEach((transport) => {
            const supplierId = transport?.supplier?._id;
            const transportCost = Math.round(
              (transport.buyingPrice || 0) * (transport.buyingRoe || 1),
            );

            if (supplierId && transportCost > 0) {
              totalCost += transportCost;
              rows.push({
                account: supplierId,
                debit: 0,
                credit: transportCost,
                description: `Transport Expense - ${transport.route} - ${booking.bookingNumber}`,
              });
            }
          });
        }

        // GROUP TICKET CREDIT ENTRY + DECREMENT SEATS
        if (linkedPackage.selectedGroupTicketId) {
          const ticket = await GroupTicket.findById(
            linkedPackage.selectedGroupTicketId,
          );

          if (ticket) {
            const supplierId = ticket?.user?._id;
            const buyingAdult = ticket?.price?.buyingAdultPrice || 0;
            const buyingChild = ticket?.price?.buyingChildPrice || 0;
            const buyingInfant = ticket?.price?.buyingInfantPrice || 0;

            const getTicketBuyingPrice = (type) => {
              if (type === "Child") return buyingChild;
              if (type === "Infant") return buyingInfant;
              return buyingAdult;
            };

            let ticketTotalCost = 0;

            if (supplierId) {
              passengers.forEach((pax) => {
                const paxName =
                  `${pax.title || ""} ${pax.givenName || ""} ${pax.surName || ""}`.trim();
                const paxCost = getTicketBuyingPrice(pax.type);

                if (paxCost > 0) {
                  ticketTotalCost += paxCost;
                  rows.push({
                    account: supplierId,
                    debit: 0,
                    credit: paxCost,
                    description: `Ticket Expense - ${paxName} (${pax.type}) - ${booking.bookingNumber}`,
                  });
                }
              });
            }

            totalCost += ticketTotalCost;

            // Decrement totalSeats on the GroupTicket
            // const seatPax =
            //   (booking.passengerCount?.adults || 0) +
            //   (booking.passengerCount?.children || 0);
            // if (seatPax > 0) {
            //   await GroupTicket.findByIdAndUpdate(ticket._id, {
            //     $inc: { totalSeats: -seatPax },
            //   });
            // }
          }
        }

        // DECREMENT AVAILABLE ROOMS ON PACKAGE
        // const totalPaxForRooms =
        //   booking.passengerCount?.total || passengers.length;
        // if (totalPaxForRooms > 0) {
        //   await GroupTicketing.findByIdAndUpdate(linkedPackage._id, {
        //     $inc: { availableRooms: -totalPaxForRooms },
        //   });
        // }

        // PROFIT / LOSS ENTRY
        const profitOrLoss = totalSellingPrice - totalCost;

        if (profitOrLoss > 0) {
          rows.push({
            account: umrahIncomeAccountId,
            debit: 0,
            credit: profitOrLoss,
            description: `Umrah Profit - ${booking.bookingNumber}`,
          });
        }

        if (profitOrLoss < 0) {
          rows.push({
            account: umrahIncomeAccountId,
            debit: Math.abs(profitOrLoss),
            credit: 0,
            description: `Umrah Loss - ${booking.bookingNumber}`,
          });
        }

        // BALANCE CHECK
        const totalDebit = rows.reduce((sum, row) => sum + (row.debit || 0), 0);
        const totalCredit = rows.reduce(
          (sum, row) => sum + (row.credit || 0),
          0,
        );

        if (totalDebit !== totalCredit) {
          // console.log("ROWS => ", rows);
          throw new Error(
            `Voucher is unbalanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
          );
        }

        // CREATE ZIP VOUCHER
        const voucherData = {
          type: "journalPortal",
          date: new Date().toISOString().split("T")[0],
          transactions: rows.map((txn, index) => ({
            metadata: { id: index },
            account: txn.account,
            description: txn.description,
            debit: txn.debit,
            credit: txn.credit,
          })),
        };

        const response = await zipAccountsService.createVoucher(voucherData);
        // console.log("ZIP Voucher Created:", response);

        // Save the ZIP voucher ID to the booking
        const createdVoucherId = response?.newVoucher?._id;
        if (createdVoucherId) {
          booking.voucherStatus = booking.voucherStatus || {};
          booking.voucherStatus.zipVoucherId = String(createdVoucherId);
          booking.voucherStatus.zipVoucherCreatedAt = new Date();
        }
      } // end else (local-db)
    } // end if (oldStatus !== "Confirmed" && status === "Confirmed")

    // =========================================
    // RESTOCK PACKAGE ROOMS WHEN BOOKING IS CANCELLED
    // =========================================
    if (
      (status === "Cancelled" && oldStatus !== "Cancelled") ||
      (oldStatus !== "On Hold" && status === "On Hold") ||
      (oldStatus !== "Pending" && status === "Pending") ||
      (oldStatus !== "In Progress" && status === "In Progress")
    ) {
      if (packageSource === "local-db") {
        await restockUmrahPackageRooms(booking);
      }

      // Void the ZIP Accounts journal voucher if it was created
      const zipVoucherId = booking.voucherStatus?.zipVoucherId;
      if (zipVoucherId) {
        try {
          await zipAccountsService.voidUnvoidVoucher(zipVoucherId, "void");
          // console.log(`ZIP Voucher ${zipVoucherId} voided successfully`);
        } catch (voidError) {
          console.error(
            `Failed to void ZIP voucher ${zipVoucherId}:`,
            voidError.message,
          );
          // Non-fatal: allow cancellation to proceed even if voiding fails
        }
      }
    }

    // =========================================
    // UPDATE OVERALL STATUS
    // =========================================
    booking.overallStatus = status;
    if (isFzPakistanPackage && status === "Cancelled") {
      booking.externalBookingMessage =
        "Booking cancelled on our side. Please verify/cancel it on the Flying Zone portal if required.";
    }
    if (isAlAyyanPackage && status === "Cancelled") {
      booking.externalBookingMessage =
        "Booking cancelled on our side. Please verify/cancel it on the Al Ayyan portal if required.";
    }
    booking.expiresAt =
      status === "On Hold" || status === "Pending"
        ? await calculateBookingExpiresAt(new Date(), packageSource)
        : null;

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Umrah booking "${booking.bookingNumber}" overall status changed from "${oldStatus}" to "${status}"`,
    });

    res.status(200).json({
      success: true,
      message: "Overall status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Overall Status Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// -------------------------
// UPDATE BOOKING PASSENGER WISE DISCOUNT
// -------------------------

export const savePassengerDiscounts = async (req, res) => {
  try {
    const { bookingId, passengers } = req.body;

    // Validation
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "bookingId is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bookingId",
      });
    }

    if (!Array.isArray(passengers) || passengers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Passengers array is required",
      });
    }

    // Find Booking
    const booking = await UmrahPackageBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Update / Upsert passenger discounts
    booking.passengers = booking.passengers.map((existingPassenger) => {
      const matchedPassenger = passengers.find(
        (p) =>
          p.passport?.toUpperCase().trim() ===
          existingPassenger.passport?.toUpperCase().trim(),
      );

      if (matchedPassenger) {
        existingPassenger.discount = matchedPassenger.discount || 0;
      }

      return existingPassenger;
    });

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Passenger discounts saved for Umrah booking "${booking.bookingNumber}"`,
    });

    return res.status(200).json({
      success: true,
      message: "Passenger discounts saved successfully",
      data: booking.passengers,
    });
  } catch (error) {
    console.error("savePassengerDiscounts error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getBookedSeats = async (req, res) => {
  try {
    const { groupId } = req.query;
    const groupFilter = groupId ? { groupId: String(groupId) } : {};

    // 1. Group Tickets se booked seats (Booking collection)
    const groupTicketSeats = await Booking.aggregate([
      {
        $match: {
          ...groupFilter,
          status: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: "$groupId",
          groupId: { $first: "$groupId" },
          groupType: { $first: "$groupType" },
          totalSeats: {
            $sum: {
              $add: [
                { $ifNull: ["$adultsCount", 0] },
                { $ifNull: ["$childrenCount", 0] },
              ],
            },
          },
          totalAdults: { $sum: "$adultsCount" },
          totalChildren: { $sum: "$childrenCount" },
          totalInfants: { $sum: "$infantsCount" },
          bookings: { $sum: 1 },
        },
      },
    ]);

    // 2. Umrah Packages se booked seats jo group ticket se关联 hain
    const umrahPackageGroupSeats = await UmrahPackageBooking.aggregate([
      {
        $match: {
          overallStatus: { $nin: ["Cancelled"] },
        },
      },
      {
        $addFields: {
          packageObjectId: {
            $convert: {
              input: "$packageId",
              to: "objectId",
              onError: null,
              onNull: null,
            },
          },
        },
      },
      {
        // Lookup package details to get selectedGroupTicketId
        $lookup: {
          from: "umrahpackagemodels", // Your GroupTicketing collection
          localField: "packageObjectId",
          foreignField: "_id",
          as: "packageInfo",
        },
      },
      {
        $unwind: {
          path: "$packageInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Filter where selectedGroupTicketId exists
        $match: {
          "packageInfo.selectedGroupTicketId": {
            ...(groupId ? { $eq: String(groupId) } : {}),
            $nin: [null, ""],
          },
        },
      },
      {
        $group: {
          _id: "$packageInfo.selectedGroupTicketId",
          groupId: { $first: "$packageInfo.selectedGroupTicketId" },
          groupType: { $first: "Umrah Package Group" },
          totalSeats: {
            $sum: {
              $add: [
                { $ifNull: ["$passengerCount.adults", 0] },
                { $ifNull: ["$passengerCount.children", 0] },
              ],
            },
          },
          totalAdults: { $sum: "$passengerCount.adults" },
          totalChildren: { $sum: "$passengerCount.children" },
          totalInfants: { $sum: "$passengerCount.infants" },
          bookings: { $sum: 1 },
        },
      },
    ]);

    // 3. Combine both results by the same group ticket id
    const groupTotals = new Map();

    const addGroupTotals = (group, source) => {
      const id = group.groupId?.toString();
      if (!id) return;

      const current = groupTotals.get(id) || {
        groupId: id,
        groupType: group.groupType,
        totalSeats: 0,
        totalAdults: 0,
        totalChildren: 0,
        totalInfants: 0,
        totalBookings: 0,
        directGroupTicketBookings: 0,
        umrahPackageBookings: 0,
      };

      current.totalSeats += group.totalSeats || 0;
      current.totalAdults += group.totalAdults || 0;
      current.totalChildren += group.totalChildren || 0;
      current.totalInfants += group.totalInfants || 0;
      current.totalBookings += group.bookings || 0;

      if (source === "groupTicket") {
        current.directGroupTicketBookings += group.bookings || 0;
      }

      if (source === "umrahPackage") {
        current.umrahPackageBookings += group.bookings || 0;
        current.groupType =
          current.groupType === group.groupType ? current.groupType : "Mixed";
      }

      groupTotals.set(id, current);
    };

    groupTicketSeats.forEach((group) => addGroupTotals(group, "groupTicket"));
    umrahPackageGroupSeats.forEach((group) =>
      addGroupTotals(group, "umrahPackage"),
    );

    const breakdownByGroup = Array.from(groupTotals.values());

    res.status(200).json({
      success: true,
      data: {
        breakdown: {
          byGroup: breakdownByGroup,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching booked seats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching booked seats",
      error: error.message,
    });
  }
};
