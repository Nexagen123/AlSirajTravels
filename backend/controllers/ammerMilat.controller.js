import axios from "axios";
import AmmerMilatGroupOverride from "../models/AmmerMilatGroupOverride.js";
import { getAmmerMilatApiBaseUrl, getAmmerMilatEnv } from "../utils/ammerMilatApi.js";
import { getValidAmmerMilatToken } from "../utils/ammerMilatToken.js";

// ─────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────

const authHeaders = async () => ({
  Authorization: `Bearer ${await getValidAmmerMilatToken()}`,
  Accept: "application/json",
});

const formatApiErrorMessage = (error) => {
  const message = error.response?.data?.message;

  if (typeof message === "string") return message;
  if (message) return JSON.stringify(message);
  if (error.response?.data) return JSON.stringify(error.response.data);

  return error.message || "Unknown error";
};

const formatDate = (dateValue) => {
  if (!dateValue) return null;
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  const d = new Date(dateValue);
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
};

// The default agency identity Ameer-e-Millat has us registered under —
// these come from the env vars pasted alongside the login credentials.
const getAmmerMilatAgencyDefaults = () => ({
  agentName: getAmmerMilatEnv("AmmerMilat_API_AgencyName") || "Qafla-e-Sagir",
  agencyName: getAmmerMilatEnv("AmmerMilat_API_AgencyName") || "Qafla-e-Sagir",
  email: getAmmerMilatEnv("AmmerMilat_API_Email"),
  mobile: getAmmerMilatEnv("AmmerMilat_API_Mobile"),
});

// ─────────────────────────────────────────────────────────
// Short-lived in-memory cache for Ameer-e-Millat's airline master list, so
// the bulk groups list (which only carries a bare airline_id) doesn't hit
// their /available/airlines endpoint on every single unified-groups request.
// ─────────────────────────────────────────────────────────
let airlinesCache = null;
let airlinesCacheAt = 0;
const AIRLINES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const fetchAmmerMilatAirlineMap = async () => {
  const now = Date.now();
  if (airlinesCache && now - airlinesCacheAt < AIRLINES_CACHE_TTL_MS) {
    return airlinesCache;
  }

  try {
    const baseUrl = getAmmerMilatApiBaseUrl();
    const response = await axios.get(`${baseUrl}/available/airlines`, {
      headers: await authHeaders(),
    });

    const airlines = response.data?.airlines || [];
    const map = {};
    for (const a of airlines) {
      if (a?.id !== undefined && a?.id !== null) map[String(a.id)] = a;
    }

    airlinesCache = map;
    airlinesCacheAt = now;
    return map;
  } catch (error) {
    console.error(
      "Error fetching Ameer-e-Millat airlines:",
      error.response?.data || error.message,
    );
    return airlinesCache || {};
  }
};

/**
 * Fetches Ameer-e-Millat's group-ticketing groups and normalises them into
 * the same shape used across the other providers (Al-Haider, FZ Pakistan),
 * so they can be merged into the unified groups response.
 */
export const fetchNormalisedAmmerMilatGroups = async (options = {}) => {
  try {
    const { includeHidden = false, type, airline_id, sector, dept_date } = options;
    const baseUrl = getAmmerMilatApiBaseUrl();

    const [response, airlineMap, overrides] = await Promise.all([
      axios.get(`${baseUrl}/available/groups`, {
        headers: await authHeaders(),
        params: { type, airline_id, sector, dept_date },
      }),
      fetchAmmerMilatAirlineMap(),
      AmmerMilatGroupOverride.find({}).lean(),
    ]);

    const rawGroups = response.data?.groups || [];
    const overrideMap = Object.fromEntries(
      overrides.map((o) => [String(o.groupId), o]),
    );

    const visibleGroups = rawGroups.filter(
      (g) => includeHidden || !overrideMap[String(g.id)]?.isHidden,
    );

    return visibleGroups.map((g) => {
      const override = overrideMap[String(g.id)];
      const airline = airlineMap[String(g.airline_id)] || null;

      // Ameer-e-Millat doesn't expose a group-level seat total — each leg in
      // `details[]` carries its own `seats`. The first/outbound leg's count
      // is the group's sellable inventory (matches their own
      // `/available/seats/{id}` endpoint for the same group).
      const firstLegSeats = parseInt(g.details?.[0]?.seats, 10) || 0;

      const normalizedDetails =
        g.details?.map((d) => ({
          sr: parseInt(d.sr, 10) || 0,
          flight_no: d.flight_no || "",
          dep_date: d.flight_date || g.dept_date || "",
          flight_date: d.flight_date || g.dept_date || "",
          dept_time: d.dept_time || "",
          origin: d.origin || "",
          destination: d.destination || "",
          arv_date: g.arv_date || null,
          arv_time: d.arv_time || "",
          baggage: g.baggage || "",
          meal: g.meal || "",
          bookedSeats: 0,
        })) || [];

      // Ameer-e-Millat's own `sector` field isn't hyphen-delimited (e.g.
      // "FAISALABADJEDDAHFAISALABAD" instead of
      // "FAISALABAD-JEDDAH-FAISALABAD"), which breaks every downstream
      // consumer that splits sectors on "-" (admin's IATA formatting,
      // sector grouping/filters, group-pricing rule keys). Each leg's own
      // `origin`/`destination` are clean, so build the sector from those
      // instead of trusting the raw field.
      const sectorFromLegs = normalizedDetails.length
        ? [
            normalizedDetails[0].origin,
            ...normalizedDetails.map((d) => d.destination),
          ]
            .filter(Boolean)
            .join("-")
        : "";
      const sector = sectorFromLegs || g.sector || "";

      return {
        id: g.id,
        source: "ammer-milat",
        isOwnGroup: false,
        isHidden: override?.isHidden ?? false,
        individualMargin: override?.individualMargin ?? null,

        sector,
        sectorKey: sector,
        type: g.type || "",

        available_no_of_pax: firstLegSeats,
        showSeat: true,
        _totalOriginalSeats: firstLegSeats,
        _onHoldSeats: 0,
        _activeBookings: 0,

        price: parseFloat(g.price) || 0,
        childPrice: 0,
        infantPrice: 0,

        pnr: g.pnr || "",

        dept_date: g.dept_date || null,
        arv_date: g.arv_date || null,

        details: normalizedDetails,

        airline: {
          id: g.airline_id || null,
          airline_name: airline?.airline_name || "",
          short_name: airline?.short_name || "",
          logo_url: airline?.logo_url || null,
        },

        user: null,
        bookedSeats: 0,
      };
    });
  } catch (error) {
    console.error(
      "Error fetching Ameer-e-Millat groups:",
      error.response?.data || error.message,
    );
    return [];
  }
};

// ─────────────────────────────────────────────────────────
// PUBLIC ENDPOINTS (mirrors the FSD Ameer-e-Millat Postman collection)
// ─────────────────────────────────────────────────────────

export const getSectors = async (req, res) => {
  try {
    const baseUrl = getAmmerMilatApiBaseUrl();
    const response = await axios.get(`${baseUrl}/available/sectors`, {
      headers: await authHeaders(),
    });

    res.status(200).json({ success: true, data: response.data?.sectors || [] });
  } catch (error) {
    console.error("AMMER-MILAT API ERROR (sectors):", formatApiErrorMessage(error));
    res.status(400).json({ success: false, message: formatApiErrorMessage(error) });
  }
};

export const getAirlines = async (req, res) => {
  try {
    const baseUrl = getAmmerMilatApiBaseUrl();
    const response = await axios.get(`${baseUrl}/available/airlines`, {
      headers: await authHeaders(),
    });

    res.status(200).json({ success: true, data: response.data?.airlines || [] });
  } catch (error) {
    console.error("AMMER-MILAT API ERROR (airlines):", formatApiErrorMessage(error));
    res.status(400).json({ success: false, message: formatApiErrorMessage(error) });
  }
};

// Ameer-e-Millat's exact field name for this endpoint isn't documented on our
// side, so this checks every shape their other endpoints use elsewhere
// (bare, nested under `data`/`group`, or a leg's `details[0].seats`) rather
// than assuming one — callers should treat a null `seats` as "unknown, don't
// override the number we already have" instead of "zero seats".
const extractSeatsCount = (payload) => {
  const candidates = [
    payload?.seats,
    payload?.available_seats,
    payload?.availableSeats,
    payload?.data?.seats,
    payload?.group?.seats,
    payload?.group?.details?.[0]?.seats,
    payload?.details?.[0]?.seats,
  ];

  for (const candidate of candidates) {
    const parsed = parseInt(candidate, 10);
    if (!isNaN(parsed)) return parsed;
  }

  return null;
};

export const getAvailableSeats = async (req, res) => {
  try {
    const { groupId } = req.params;
    const baseUrl = getAmmerMilatApiBaseUrl();
    const response = await axios.get(`${baseUrl}/available/seats/${groupId}`, {
      headers: await authHeaders(),
    });

    res.status(200).json({
      success: true,
      data: { seats: extractSeatsCount(response.data), raw: response.data },
    });
  } catch (error) {
    console.error("AMMER-MILAT API ERROR (seats):", formatApiErrorMessage(error));
    res.status(400).json({ success: false, message: formatApiErrorMessage(error) });
  }
};

export const getGroupDetail = async (req, res) => {
  try {
    const { groupId } = req.params;
    const baseUrl = getAmmerMilatApiBaseUrl();
    const response = await axios.get(`${baseUrl}/group/detail/${groupId}`, {
      headers: await authHeaders(),
    });

    res.status(200).json({ success: true, data: response.data?.group || null });
  } catch (error) {
    console.error("AMMER-MILAT API ERROR (group detail):", formatApiErrorMessage(error));
    res.status(400).json({ success: false, message: formatApiErrorMessage(error) });
  }
};

export const getBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const baseUrl = getAmmerMilatApiBaseUrl();
    const response = await axios.get(`${baseUrl}/show/booking/${bookingId}`, {
      headers: await authHeaders(),
    });

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error("AMMER-MILAT API ERROR (show booking):", formatApiErrorMessage(error));
    res.status(400).json({ success: false, message: formatApiErrorMessage(error) });
  }
};

// ─────────────────────────────────────────────────────────
// GET ALL GROUPS (admin — includes hidden + override data)
// ─────────────────────────────────────────────────────────

export const getAdminAmmerMilatGroups = async (req, res) => {
  try {
    const groups = await fetchNormalisedAmmerMilatGroups({
      includeHidden: true,
      type: req.query.type,
      airline_id: req.query.airline_id,
      sector: req.query.sector,
      dept_date: req.query.dept_date,
    });

    return res.json({ success: true, data: groups });
  } catch (error) {
    console.error("Error fetching admin Ameer-e-Millat groups:", error?.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch groups from Ameer-e-Millat",
    });
  }
};

// ─────────────────────────────────────────────────────────
// UPSERT GROUP OVERRIDE (admin — hide/show a group or set its margin)
// ─────────────────────────────────────────────────────────

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

export const upsertAmmerMilatGroupOverride = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { isHidden, individualMargin } = req.body;

    const update = {};
    if (isHidden !== undefined) update.isHidden = Boolean(isHidden);
    if (individualMargin !== undefined) {
      update.individualMargin = normalizeOverrideMargin(individualMargin);
    }

    const override = await AmmerMilatGroupOverride.findOneAndUpdate(
      { groupId: String(groupId) },
      { $set: update },
      { upsert: true, new: true },
    );

    return res.json({ success: true, data: override });
  } catch (error) {
    const status = error.message?.includes("Individual margin") ? 400 : 500;
    console.error("Error upserting Ameer-e-Millat group override:", error?.message);
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to update group override",
    });
  }
};

// ─────────────────────────────────────────────────────────
// CREATE BOOKING ON AMEER-E-MILLAT
// ─────────────────────────────────────────────────────────

const getTitleForAmmerMilat = (type, existingTitle) => {
  if (existingTitle) {
    const upperTitle = existingTitle.toUpperCase();
    if (["MR", "MRS", "MS", "CHD", "INF"].includes(upperTitle)) {
      return upperTitle;
    }
  }
  const titleMap = { Adult: "MR", Child: "CHD", Infant: "INF" };
  return titleMap[type] || "MR";
};

/**
 * Creates a booking on the Ameer-e-Millat platform for one of their
 * group-ticketing groups (`POST /api/create/booking`). Mirrors our own
 * `/bookings` POST contract, authenticated as our agency account via the
 * cached Ameer-e-Millat token.
 *
 * This booking is created on Ameer-e-Millat's side only — its own status
 * is managed on their portal and is NOT synced back here automatically;
 * our own Booking document remains the source of truth for our agents.
 *
 * @param {Object} bookingData - Same shape as our own createBooking payload
 * @returns {{success: boolean, bookingId: string|null, pnr: string|null, message: string, raw: any}}
 */
export const createAmmerMilatBooking = async (bookingData) => {
  try {
    const groupIdNumber = parseInt(bookingData.groupId, 10);
    if (isNaN(groupIdNumber)) {
      throw new Error("Invalid group ID format for Ameer-e-Millat");
    }

    const agency = getAmmerMilatAgencyDefaults();

    const payload = {
      group_id: groupIdNumber,
      agency_info: {
        group_id: groupIdNumber,
        agent_name: agency.agentName,
        agency_name: agency.agencyName,
        email: agency.email,
        mobile: agency.mobile,
        adults: bookingData.adultsCount || 0,
        child: bookingData.childrenCount || null,
        infant: bookingData.infantsCount || null,
        agent_notes: bookingData.contactPersonName
          ? `Contact: ${bookingData.contactPersonName}`
          : null,
      },
      booking_details: (bookingData.passengers || []).map((p) => {
        const type = p.type || "Adult";
        return {
          type,
          surname: p.surName || p.surname || "",
          given_name: p.givenName || p.given_name || "",
          title: getTitleForAmmerMilat(type, p.title),
          passport_no: p.passport || p.passport_no || "",
          dob: formatDate(p.dateOfBirth || p.dob),
          doe: formatDate(p.passportExpiry || p.doe),
        };
      }),
    };

    const baseUrl = getAmmerMilatApiBaseUrl();
    const response = await axios.post(`${baseUrl}/create/booking`, payload, {
      headers: await authHeaders(),
    });

    if (response.data?.error || response.data?.success === false) {
      throw new Error(response.data?.message || "Booking rejected by Ameer-e-Millat");
    }

    const created = response.data?.data;

    return {
      success: true,
      bookingId: created?.id ?? created?.booking_id ?? null,
      pnr: created?.group?.pnr || created?.pnr || null,
      message: response.data?.message || "Booking created on Ameer-e-Millat",
      raw: response.data,
    };
  } catch (error) {
    const message = formatApiErrorMessage(error);
    console.error("Error creating Ameer-e-Millat booking:", message);
    return { success: false, bookingId: null, pnr: null, message, raw: error.response?.data };
  }
};
