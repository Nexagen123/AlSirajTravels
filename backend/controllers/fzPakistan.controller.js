import axios from "axios";
import { getValidFzPakistanToken } from "../utils/fzPakistanToken.js";
import FzPakistanGroupOverride from "../models/FzPakistanGroupOverride.js";
import { getFzPakistanApiBaseUrl } from "../utils/fzPakistanApi.js";

const formatApiErrorMessage = (error) => {
  const message = error.response?.data?.message;

  if (typeof message === "string") return message;
  if (message) return JSON.stringify(message);
  if (error.response?.data) return JSON.stringify(error.response.data);

  return error.message || "Unknown error";
};

const formatDate = (dateValue) => {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
};

const isPrivateGroup = (group = {}) =>
  String(group?.internalStatus || "").trim().toLowerCase() === "private";

const isUpcomingGroup = (group = {}) => {
  if (!group.dept_date) return true;

  const depDate = new Date(group.dept_date);
  if (Number.isNaN(depDate.getTime())) return true;

  depDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return depDate >= today;
};

const normalizeOverrideMargin = (value) => {
  if (value === "" || value === null || value === undefined || value == 0) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Individual margin must be a positive number");
  }

  return parsed;
};

const mapFlight = (f, index) => ({
  sr: index + 1,
  flight_no: f.flightNo,
  dep_date: formatDate(f.depDate),
  flight_date: formatDate(f.depDate),
  dept_time: f.depTime,
  origin: f.fromTerminal,
  destination: f.toTerminal,
  arv_date: formatDate(f.arrDate),
  arv_time: f.arrTime,
  // FZ Pakistan baggage values already include the "KG" suffix (e.g. "30+7KG"),
  // but the UI appends "KG" itself, so strip it here to avoid "30+7KGKG".
  baggage: f.baggage ? f.baggage.replace(/kg$/i, "").trim() : f.baggage,
  meal: f.meal,
});

const normalizeFzUmrahPackage = (
  pkg,
  { groupTicketMap = {}, bookedSeatsMap = {} } = {},
) => {
  const packageId = String(pkg?._id || pkg?.id || "");
  const selectedGroupTicketId = String(
    pkg?.selectedGroupTicketId || pkg?.groupTicket?._id || pkg?.groupTicket?.id || "",
  );

  const linkedGroupTicket = selectedGroupTicketId
    ? groupTicketMap[selectedGroupTicketId]
    : null;
  const groupTicketTotalSeats =
    linkedGroupTicket && Number.isFinite(Number(linkedGroupTicket.totalSeats))
      ? Number(linkedGroupTicket.totalSeats)
      : null;
  const groupTicketBookedSeats = selectedGroupTicketId
    ? Number(bookedSeatsMap[selectedGroupTicketId]) || 0
    : 0;
  const remainingGroupTicketSeats =
    groupTicketTotalSeats !== null
      ? Math.max(0, groupTicketTotalSeats - groupTicketBookedSeats)
      : null;

  return {
    ...pkg,
    _id: packageId,
    id: packageId,
    packageSource: "fz-pakistan",
    source: "fz-pakistan",
    internalStatus: pkg?.internalStatus || "Public",
    selectedGroupTicketId,
    groupTicket: linkedGroupTicket || pkg?.groupTicket,
    groupTicketBookedSeats,
    groupTicketTotalSeats: groupTicketTotalSeats ?? "",
    availableRooms:
      remainingGroupTicketSeats !== null
        ? remainingGroupTicketSeats
        : Number(pkg?.availableRooms) || 0,
  };
};

/**
 * Creates a booking on the FZ Pakistan (Flying Zone) platform for one of
 * their group-ticketing groups. This mirrors our own /bookings POST
 * contract (same underlying schema), authenticated as our agency account
 * via the cached FZ Pakistan token.
 *
 * This booking is created on FZ Pakistan's side only — its own status
 * (confirm/cancel) is managed by FZ Pakistan and is NOT synced back here.
 * Our own Booking document remains the source of truth for our agents.
 *
 * @param {Object} bookingData - Same shape as our own createBooking payload
 * @returns {{success: boolean, bookingId: string|null, message: string}}
 */
export const createFzPakistanBooking = async (bookingData) => {
  try {
    const baseUrl = getFzPakistanApiBaseUrl();
    const token = await getValidFzPakistanToken();

    const payload = {
      groupId: bookingData.groupId,
      groupType: bookingData.groupType,
      airline: bookingData.airline,
      sector: bookingData.sector,
      pnr: bookingData.pnr || "",
      contactPersonName: bookingData.contactPersonName || "N/A",
      adultsCount: bookingData.adultsCount,
      childrenCount: bookingData.childrenCount,
      infantsCount: bookingData.infantsCount,
      totalPassengers: bookingData.totalPassengers,
      pricing: bookingData.pricing,
      passengers: bookingData.passengers,
      flights: bookingData.flights,
      departureDate: bookingData.departureDate,
      arrivalDate: bookingData.arrivalDate,
    };

    const response = await axios.post(`${baseUrl}/bookings`, payload, {
      headers: { Authorization: `b ${token}` },
    });

    const created = response.data?.data;

    return {
      success: !!response.data?.success,
      bookingId: created?._id || created?.bookingReference || null,
      message: response.data?.message || "Booking created on FZ Pakistan",
    };
  } catch (error) {
    const message = formatApiErrorMessage(error);
    console.error("Error creating FZ Pakistan booking:", message);
    return { success: false, bookingId: null, message };
  }
};

// Short-lived in-memory cache for FZ Pakistan's airline master list, so we
// don't hit their /airline endpoint on every single unified-groups request.
let fzAirlinesCache = null;
let fzAirlinesCacheAt = 0;
const FZ_AIRLINES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches FZ Pakistan's own airline master list (name, short code, logo)
 * from their `/airline` endpoint. Their group-ticketing groups only carry
 * a plain airline name string, so this is required to resolve logos —
 * matching against OUR local Airline collection is unreliable since the
 * two platforms' airline records don't necessarily correspond.
 */
const fetchFzPakistanAirlines = async () => {
  const now = Date.now();
  if (fzAirlinesCache && now - fzAirlinesCacheAt < FZ_AIRLINES_CACHE_TTL_MS) {
    return fzAirlinesCache;
  }

  try {
    const baseUrl = getFzPakistanApiBaseUrl();
    const token = await getValidFzPakistanToken();

    const response = await axios.get(`${baseUrl}/airline/`, {
      headers: { Authorization: `b ${token}` },
    });

    const airlines = response.data?.success ? response.data.data || [] : [];
    fzAirlinesCache = airlines;
    fzAirlinesCacheAt = now;
    return airlines;
  } catch (error) {
    console.error(
      "Error fetching FZ Pakistan airlines:",
      error.response?.data || error.message,
    );
    // Fall back to whatever we last had cached rather than losing all logos
    return fzAirlinesCache || [];
  }
};

/**
 * Fetches FZ Pakistan's own live booked-seats breakdown (per group,
 * aggregated across ALL of their bookings — every reseller/agent on their
 * platform, not just bookings we create via `createFzPakistanBooking`).
 * This is the authoritative source of truth for how many seats are
 * actually taken, since the group-ticketing list's `totalSeats` field is
 * the group's original/gross capacity and is NOT decremented on its own.
 */
const fetchFzPakistanBookedSeatsMap = async () => {
  try {
    const baseUrl = getFzPakistanApiBaseUrl();
    const token = await getValidFzPakistanToken();

    const response = await axios.get(`${baseUrl}/bookings/getBookedSeats`, {
      headers: { Authorization: `b ${token}` },
    });

    const byGroup = response.data?.success
      ? response.data.data?.breakdown?.byGroup || []
      : [];

    const map = {};
    for (const group of byGroup) {
      if (group.groupId) {
        map[String(group.groupId)] = Number(group.totalSeats) || 0;
      }
    }
    return map;
  } catch (error) {
    console.error(
      "Error fetching FZ Pakistan booked seats:",
      error.response?.data || error.message,
    );
    return {};
  }
};

export const createFzPakistanUmrahBooking = async (bookingData) => {
  try {
    const baseUrl = getFzPakistanApiBaseUrl();
    const token = await getValidFzPakistanToken();

    const response = await axios.post(`${baseUrl}/umrah-bookings/`, bookingData, {
      headers: { Authorization: `b ${token}` },
    });

    const created = response.data?.data;

    return {
      success: !!response.data?.success,
      bookingId: created?._id || created?.bookingNumber || null,
      message: response.data?.message || "Umrah booking created on FZ Pakistan",
      data: created || response.data,
    };
  } catch (error) {
    const message = formatApiErrorMessage(error);
    console.error("Error creating FZ Pakistan Umrah booking:", message);
    return { success: false, bookingId: null, message };
  }
};

export const fetchFzPakistanAdminProfile = async () => {
  const baseUrl = getFzPakistanApiBaseUrl();
  const token = await getValidFzPakistanToken();

  const response = await axios.get(`${baseUrl}/auth/admin/profile`, {
    headers: { Authorization: `b ${token}` },
  });

  return response.data?.success ? response.data.data || null : null;
};

const fetchFzPakistanGroupTicketMap = async () => {
  try {
    const baseUrl = getFzPakistanApiBaseUrl();
    const token = await getValidFzPakistanToken();

    const response = await axios.get(`${baseUrl}/group-ticketing/`, {
      headers: { Authorization: `b ${token}` },
    });

    const rawGroups = response.data?.success ? response.data.data || [] : [];
    const map = {};
    for (const group of rawGroups) {
      const groupId = String(group?._id || group?.id || "");
      if (groupId) map[groupId] = group;
    }
    return map;
  } catch (error) {
    console.error(
      "Error fetching FZ Pakistan group tickets for Umrah packages:",
      error.response?.data || error.message,
    );
    return {};
  }
};

export const fetchNormalisedFzPakistanUmrahPackages = async () => {
  try {
    const baseUrl = getFzPakistanApiBaseUrl();
    const token = await getValidFzPakistanToken();

    const [packageRes, groupTicketMap, bookedSeatsMap] = await Promise.all([
      axios.get(`${baseUrl}/umrahpackages/`, {
        headers: { Authorization: `b ${token}` },
      }),
      fetchFzPakistanGroupTicketMap(),
      fetchFzPakistanBookedSeatsMap(),
    ]);

    const rawPackages = packageRes.data?.success
      ? packageRes.data.data || []
      : [];

    return rawPackages
      .filter((pkg) => !isPrivateGroup(pkg))
      .map((pkg) =>
        normalizeFzUmrahPackage(pkg, { groupTicketMap, bookedSeatsMap }),
      );
  } catch (error) {
    console.error(
      "Error fetching FZ Pakistan Umrah packages:",
      error.response?.data || error.message,
    );
    return [];
  }
};

export const fetchNormalisedFzPakistanUmrahPackageById = async (packageId) => {
  try {
    const baseUrl = getFzPakistanApiBaseUrl();
    const token = await getValidFzPakistanToken();

    const [packageRes, groupTicketMap, bookedSeatsMap] = await Promise.all([
      axios.get(`${baseUrl}/umrahpackages/${packageId}`, {
        headers: { Authorization: `b ${token}` },
      }),
      fetchFzPakistanGroupTicketMap(),
      fetchFzPakistanBookedSeatsMap(),
    ]);

    const packageData = packageRes.data?.package || packageRes.data?.data;
    if (!packageRes.data?.success || !packageData) return null;
    if (isPrivateGroup(packageData)) return null;

    return normalizeFzUmrahPackage(packageData, {
      groupTicketMap,
      bookedSeatsMap,
    });
  } catch (error) {
    if (error.response?.status !== 404) {
      console.error(
        "Error fetching FZ Pakistan Umrah package:",
        error.response?.data || error.message,
      );
    }
    return null;
  }
};

/**
 * Fetches group tickets from the FZ Pakistan (Flying Zone) group-ticketing
 * API and normalises them into the same shape used for admin groups, so
 * they can be merged into the unified groups response.
 */
export const fetchNormalisedFzPakistanGroups = async (options = {}) => {
  try {
    const { includeHidden = false } = options;
    const baseUrl = getFzPakistanApiBaseUrl();
    const token = await getValidFzPakistanToken();

    const [response, fzAirlines, bookedSeatsMap, overrides] = await Promise.all([
      axios.get(`${baseUrl}/group-ticketing/`, {
        headers: { Authorization: `b ${token}` },
      }),
      fetchFzPakistanAirlines(),
      fetchFzPakistanBookedSeatsMap(),
      FzPakistanGroupOverride.find({}).lean(),
    ]);

    const rawGroups = response.data?.success ? response.data.data || [] : [];
    const overrideMap = Object.fromEntries(
      overrides.map((override) => [String(override.groupId), override]),
    );
    const publicGroups = rawGroups
      .filter((g) => !isPrivateGroup(g))
      .filter((g) => includeHidden || !overrideMap[String(g._id)]?.isHidden);

    // Map FZ's airline name -> { shortCode, logo } for quick lookup
    const airlineMap = {};
    for (const a of fzAirlines) {
      const key = (a.airlineName || "").trim().toLowerCase();
      if (key) {
        airlineMap[key] = { shortCode: a.shortCode || null, logo: a.logo || null };
      }
    }

    return publicGroups.map((g) => {
      const override = overrideMap[String(g._id)];
      const details = (g.flights || []).map(mapFlight);
      const matchedAirline =
        airlineMap[(g.airline || "").trim().toLowerCase()] || null;
      const bookedSeats = bookedSeatsMap[String(g._id)] || 0;
      const availableSeats = Math.max(
        0,
        (Number(g.totalSeats) || 0) - bookedSeats,
      );

      return {
        id: g._id,
        sector: g.sector,
        type: g.groupCategory || g.groupType || "",
        internalStatus: g.internalStatus || "Public",
        isHidden: override?.isHidden ?? false,
        individualMargin: override?.individualMargin ?? null,

        available_no_of_pax: availableSeats,
        showSeat: g.showSeat,

        price: g.price?.sellingAdultPriceB2B || 0,
        childPrice: g.price?.sellingChildPriceB2B || 0,
        infantPrice: g.price?.sellingInfantPriceB2B || 0,

        pnr: g.pnr,

        dept_date: formatDate(g.flights?.[0]?.depDate),
        arv_date: formatDate(g.flights?.[g.flights.length - 1]?.arrDate),

        details,

        airline: {
          id: null,
          airline_name: g.airline,
          short_name: matchedAirline?.shortCode || null,
          logo_url: matchedAirline?.logo || null,
        },
      };
    });
  } catch (error) {
    console.error(
      "Error fetching FZ Pakistan groups:",
      error.response?.data || error.message,
    );
    return [];
  }
};

export const getAdminFzPakistanGroups = async (req, res) => {
  try {
    const groups = (
      await fetchNormalisedFzPakistanGroups({ includeHidden: true })
    ).filter(isUpcomingGroup);

    return res.json({ success: true, data: groups });
  } catch (error) {
    console.error("Error fetching admin FZ Pakistan groups:", error?.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch groups from FZ Pakistan",
    });
  }
};

export const upsertFzPakistanGroupOverride = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { isHidden, individualMargin } = req.body;

    const update = {};
    if (isHidden !== undefined) update.isHidden = Boolean(isHidden);
    if (individualMargin !== undefined) {
      update.individualMargin = normalizeOverrideMargin(individualMargin);
    }

    const override = await FzPakistanGroupOverride.findOneAndUpdate(
      { groupId: String(groupId) },
      { $set: update },
      { upsert: true, returnDocument: "after" },
    );

    return res.json({ success: true, data: override });
  } catch (error) {
    const status = error.message?.includes("Individual margin") ? 400 : 500;
    console.error("Error upserting FZ Pakistan group override:", error?.message);
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to update group override",
    });
  }
};
