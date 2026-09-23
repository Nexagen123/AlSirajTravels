import axios from "axios";
import { getAlAyyanApiBaseUrl } from "../utils/alAyyanApi.js";
import { getAlAyyanAuthHeaders } from "../utils/alAyyanToken.js";

// ─────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────

const formatApiErrorMessage = (error) => {
  const data = error.response?.data;
  const message = data?.Message || data?.message || data?.title;
  const details = data?.Errors || data?.errors;

  // ASP.NET Core's default ModelState validation response shapes `errors`
  // as an object keyed by field name (e.g. {"DocumentIssue": ["..."]})
  // rather than a flat array — surface those field names too, since
  // without them a message like "Validation failed" doesn't say which
  // passenger field was rejected.
  const fieldDetails =
    details && !Array.isArray(details) && typeof details === "object"
      ? Object.entries(details)
          .map(
            ([field, msgs]) =>
              `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`,
          )
          .join("; ")
      : null;

  if (typeof message === "string") {
    if (Array.isArray(details) && details.length > 0) {
      return `${message}: ${details.join("; ")}`;
    }
    if (fieldDetails) {
      return `${message} (${fieldDetails})`;
    }
    return message;
  }
  if (data) return JSON.stringify(data);
  return error.message || "Unknown error";
};

const formatDate = (dateValue) => {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
};

// Al Ayyan's passenger date fields (DOB, document issue/expiry) are typed
// as full ISO 8601 datetimes per their Agent API docs (e.g.
// "1990-01-15T00:00:00Z"), not date-only strings — sending a bare
// "YYYY-MM-DD" risks failing their model binding, so always normalise to a
// full datetime before sending booking payloads.
const toIsoDateTime = (dateValue) => {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

// Al Ayyan requires a fromDate/toDate window on every search. We ask for a
// generous rolling window (a week back, a year forward) since — like
// Al-Haider/FZ Pakistan — we want everything they have on offer, not a
// user-entered date range.
const searchWindow = () => {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);

  const toDate = new Date();
  toDate.setFullYear(toDate.getFullYear() + 1);

  return { fromDate: fromDate.toISOString(), toDate: toDate.toISOString() };
};

const ROOM_KEY_MAP = {
  sharing: "shared",
  shared: "shared",
  double: "double",
  triple: "triple",
  quad: "quad",
};

// ─────────────────────────────────────────────────────────
// FLIGHT GROUPS
// ─────────────────────────────────────────────────────────

/**
 * Fetches Al Ayyan's available flight ticket groups and normalises them into
 * the same shape used for the other external sources (Al-Haider, FZ
 * Pakistan) so they can be merged into the unified groups response.
 */
export const fetchNormalisedAlAyyanGroups = async () => {
  try {
    const baseUrl = getAlAyyanApiBaseUrl();
    const headers = await getAlAyyanAuthHeaders();
    const { fromDate, toDate } = searchWindow();

    const response = await axios.post(
      `${baseUrl}/api/AgentApi/SearchGroups`,
      {
        airLine: "",
        departureAirport: "",
        arrivalAirport: "",
        toDate,
        fromDate,
        flexible: true,
        umrahSector: false,
      },
      { headers },
    );

    const rawGroups = response.data?.Results || [];

    return rawGroups.map((g) => {
      const details = (g.Routes || []).map((r, i) => ({
        sr: r.Order || i + 1,
        flight_no: r.FlightNo || "",
        dep_date: formatDate(r.DepartureDate) || formatDate(g.DepartureDate),
        dept_time: r.DepartureTime || "",
        origin: r.DepartureAirportCode || "",
        destination: r.ArrivalAirportCode || "",
        arv_date: formatDate(r.ArrivalDate) || formatDate(g.ArrivalDate),
        arv_time: r.ArrivalTime || "",
        baggage: g.Luggage || "",
        meal: g.MealNote || "",
        bookedSeats: 0,
      }));

      const totalSeats = parseInt(g.AvailableSeats, 10) || 0;

      return {
        id: g.BookingId,
        source: "al-ayyan",
        isOwnGroup: false,

        sector:
          g.RouteCodes || `${g.DepartureAirportCode}-${g.ArrivalAirportCode}`,
        sectorKey:
          g.RouteCodes || `${g.DepartureAirportCode}-${g.ArrivalAirportCode}`,
        // Al Ayyan doesn't classify groups by type — fall back to a fixed
        // label since Booking.groupType is a required field.
        type: "Al Ayyan Group",

        available_no_of_pax: totalSeats,
        showSeat: true,
        _totalOriginalSeats: totalSeats,
        _onHoldSeats: 0,
        _activeBookings: 0,

        price: parseFloat(g.SalePrice) || 0,
        childPrice: 0,
        infantPrice: 0,

        pnr: "",

        dept_date: formatDate(g.DepartureDate),
        arv_date: formatDate(g.ArrivalDate),

        details,

        airline: {
          id: null,
          airline_name: g.AirLineName || "",
          short_name: g.AirLineCode || (g.AirLineName || "").substring(0, 2),
          logo_url: null,
        },

        user: null,
        bookedSeats: 0,
      };
    });
  } catch (error) {
    console.error(
      "Error fetching Al Ayyan groups:",
      formatApiErrorMessage(error),
    );
    return [];
  }
};

export const getAlAyyanGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const baseUrl = getAlAyyanApiBaseUrl();
    const headers = await getAlAyyanAuthHeaders();

    const response = await axios.get(`${baseUrl}/api/AgentApi/GetGroupById`, {
      params: { id },
      headers,
    });

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error(
      "Error fetching Al Ayyan group by id:",
      formatApiErrorMessage(error),
    );
    res.status(error.response?.status || 400).json({
      success: false,
      message: formatApiErrorMessage(error),
    });
  }
};

/**
 * Creates a booking on Al Ayyan for one of their flight ticket groups.
 * Mirrors the createFzPakistanBooking contract used by booking.controller.js.
 *
 * @param {Object} bookingData
 * @param {String} bookingData.groupId       Al Ayyan's BookingId for the group
 * @param {Array}  bookingData.passengers     Passenger objects from our Booking model
 * @returns {{success: boolean, bookingId: string|null, message: string, data?: object}}
 */
export const createAlAyyanBooking = async (bookingData) => {
  const payload = {
    bookingId: bookingData.groupId,
    passengers: (bookingData.passengers || []).map((p) => ({
      ticketType: p.type || p.ticketType || "Adult",
      passengerTitle: p.title || "",
      passengerFirstName: p.givenName || "",
      passengerLastName: p.surName || p.surname || "",
      passengerDOB: toIsoDateTime(p.dateOfBirth || p.dob),
      docNumber: p.passport || "",
      documentIssue: toIsoDateTime(p.passportIssue),
      documentExpiry: toIsoDateTime(p.passportExpiry || p.expiry || p.doe),
    })),
  };

  try {
    const baseUrl = getAlAyyanApiBaseUrl();
    const headers = await getAlAyyanAuthHeaders();

    const response = await axios.post(
      `${baseUrl}/api/AgentApi/BookGroup`,
      payload,
      { headers },
    );

    const data = response.data;

    return {
      success: true,
      bookingId:
        data?.SaleReferenceKey ||
        data?.saleReferenceKey ||
        data?.BookingReference ||
        data?.bookingReference ||
        data?.Id ||
        data?.id ||
        null,
      message: data?.Message || data?.message || "Booking created on Al Ayyan",
      data,
    };
  } catch (error) {
    const message = formatApiErrorMessage(error);
    console.error("Error creating Al Ayyan booking:", message);
    console.error("Al Ayyan BookGroup payload was:", JSON.stringify(payload));
    console.error(
      "Al Ayyan BookGroup raw error response:",
      JSON.stringify(error.response?.data),
    );
    return { success: false, bookingId: null, message };
  }
};

// ─────────────────────────────────────────────────────────
// TRAVEL PACKAGES
// ─────────────────────────────────────────────────────────

const mapAlAyyanPackage = (pkg) => {
  const airlineName = (pkg.AirLineName || "").trim();
  const airlineCode = (pkg.AirLineCode || "").trim();

  const packageTotals = {
    double: 0,
    triple: 0,
    quad: 0,
    shared: 0,
    childWithoutBed: 0,
    infant: 0,
    incentive: 0,
  };

  for (const p of pkg.Prices || []) {
    const key = ROOM_KEY_MAP[(p.ReservationType || "").trim().toLowerCase()];
    if (key) packageTotals[key] = Number(p.Price) || 0;
  }
  if (pkg.InfantSalePrice != null) {
    packageTotals.infant = Number(pkg.InfantSalePrice) || 0;
  }

  const flights = (pkg.Routes || []).map((r) => ({
    airline: airlineCode || airlineName,
    airlineName,
    airlineCode,
    flightNo: r.FlightNo || "",
    depDate: formatDate(r.DepartureDate),
    depTime: r.DepartureTime || "",
    arrDate: formatDate(r.ArrivalDate),
    arrTime: r.ArrivalTime || "",
    sectorFrom: r.DepartureAirportCode || pkg.DepartureAirportCode || "",
    sectorTo: r.ArrivalAirportCode || pkg.ArrivalAirportCode || "",
    baggage: pkg.Luggage || "",
    meal: pkg.MealNote || "",
  }));

  const hotels = (pkg.Hotels || []).map((h) => ({
    name: h.HotelName || "",
    location: { city: h.CityName || "", distance: h.Distance || "" },
    nights: Number(h.Nights) || 0,
  }));

  const packageId = String(pkg.PackageId || "");
  // SearchPackages misspells this field ("AvailableSeates"); GetPackageById
  // spells it correctly — accept both.
  const availableRooms =
    Number(pkg.AvailableSeates ?? pkg.AvailableSeats) || 0;

  return {
    id: packageId,
    _id: packageId,
    packageName: pkg.Name || `Al Ayyan Package ${packageId}`,
    logo: "",
    flightLogo: "",
    airlineName,
    airline: {
      airline_name: airlineName,
      short_name: airlineCode || airlineName.substring(0, 2),
      logo_url: null,
    },
    days: Number(pkg.TotalNights) || 0,
    availableRooms,
    internalStatus: "Public",
    flights,
    hotels,
    packageTotals,
    packageSource: "al-ayyan",
    source: "al-ayyan",
    externalId: packageId,
    transportIncluded: (pkg.Transport || "").trim().toLowerCase() === "yes",
    createdAt: new Date(),
    updatedAt: new Date(),
    visibility: true,
  };
};

/**
 * Fetches Al Ayyan's travel packages and normalises them into the same
 * shape used for our local (GroupTicketing) and FZ Pakistan Umrah packages,
 * so they can be merged into the unified packages response.
 */
export const fetchNormalisedAlAyyanPackages = async () => {
  try {
    const baseUrl = getAlAyyanApiBaseUrl();
    const headers = await getAlAyyanAuthHeaders();
    const { fromDate, toDate } = searchWindow();

    const response = await axios.post(
      `${baseUrl}/api/AgentApi/SearchPackages`,
      {
        airLine: "",
        departureAirport: "",
        arrivalAirport: "",
        toDate,
        fromDate,
        flexible: true,
        maxNights: 0,
      },
      { headers },
    );

    const rawPackages = response.data?.Results || [];
    return rawPackages.map(mapAlAyyanPackage);
  } catch (error) {
    console.error(
      "Error fetching Al Ayyan packages:",
      formatApiErrorMessage(error),
    );
    return [];
  }
};

export const fetchNormalisedAlAyyanPackageById = async (packageId) => {
  try {
    const baseUrl = getAlAyyanApiBaseUrl();
    const headers = await getAlAyyanAuthHeaders();

    const response = await axios.get(
      `${baseUrl}/api/AgentApi/GetPackageById`,
      {
        params: { id: packageId },
        headers,
      },
    );

    if (!response.data) return null;
    return mapAlAyyanPackage({ PackageId: packageId, ...response.data });
  } catch (error) {
    if (error.response?.status !== 404 && error.response?.status !== 400) {
      console.error(
        "Error fetching Al Ayyan package by id:",
        formatApiErrorMessage(error),
      );
    }
    return null;
  }
};

/**
 * Creates a booking on Al Ayyan for one of their travel packages. Mirrors
 * createFzPakistanUmrahBooking's contract.
 *
 * @param {Object} bookingData
 * @param {String} bookingData.packageId
 * @param {String} bookingData.reservationType  e.g. "Double" | "Triple" | "Quad" | "Sharing"
 * @param {Array}  bookingData.passengers
 */
export const createAlAyyanPackageBooking = async (bookingData) => {
  const payload = {
    packageId: bookingData.packageId,
    reservationType: bookingData.reservationType,
    passengers: (bookingData.passengers || []).map((p) => ({
      ticketType: p.type || p.ticketType || "Adult",
      passengerTitle: p.title || "",
      passengerFirstName: p.givenName || "",
      passengerLastName: p.surName || p.surname || "",
      passengerDOB: toIsoDateTime(p.dateOfBirth || p.dob),
      docNumber: p.passport || "",
      documentIssue: toIsoDateTime(p.passportIssue),
      documentExpiry: toIsoDateTime(p.passportExpiry || p.expiry || p.doe),
    })),
  };

  try {
    const baseUrl = getAlAyyanApiBaseUrl();
    const headers = await getAlAyyanAuthHeaders();

    const response = await axios.post(
      `${baseUrl}/api/AgentApi/BookPackage`,
      payload,
      { headers },
    );

    const data = response.data;

    return {
      success: true,
      bookingId:
        data?.SaleReferenceKey ||
        data?.saleReferenceKey ||
        data?.BookingReference ||
        data?.bookingReference ||
        data?.Id ||
        data?.id ||
        null,
      message: data?.Message || data?.message || "Booking created on Al Ayyan",
      data,
    };
  } catch (error) {
    const message = formatApiErrorMessage(error);
    console.error("Error creating Al Ayyan package booking:", message);
    console.error(
      "Al Ayyan BookPackage payload was:",
      JSON.stringify(payload),
    );
    console.error(
      "Al Ayyan BookPackage raw error response:",
      JSON.stringify(error.response?.data),
    );
    return { success: false, bookingId: null, message };
  }
};

export const getAlAyyanPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    const pkg = await fetchNormalisedAlAyyanPackageById(id);

    if (!pkg) {
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });
    }

    res.status(200).json({ success: true, data: pkg });
  } catch (error) {
    console.error("Error fetching Al Ayyan package:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
