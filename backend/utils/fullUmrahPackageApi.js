import axios from "axios";

export const FULL_UMRAH_PACKAGE_SOURCE = "full-umrah-package";
const DEFAULT_BASE_URL = "https://fullumrahpackage.com";
const CACHE_TTL_MS = 5 * 60 * 1000;

let packagesCache = null;
let packagesCacheAt = 0;

const getBaseUrl = () =>
  (process.env.FULL_UMRAH_PACKAGE_API_URL || DEFAULT_BASE_URL).replace(
    /\/$/,
    "",
  );

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const toAbsoluteUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${getBaseUrl()}${String(value).startsWith("/") ? "" : "/"}${value}`;
};

const normalizePackage = (pkg = {}) => {
  const packageId = String(
    pkg.PackageCode || pkg.packageCode || pkg._id || pkg.id || "",
  );
  const travelDate = pkg.TravelDate || pkg.travelDate || null;
  const airline = pkg.AirlineName || pkg.airlineName || "";
  const routeStart = pkg.RouteStart || pkg.routeStart || "";
  const routeEnd = pkg.RouteEnd || pkg.routeEnd || "";
  const packageTotals = {
    shared: toNumber(pkg.PriceSharing ?? pkg.priceSharing),
    quad: toNumber(pkg.PriceQuad ?? pkg.priceQuad),
    triple: toNumber(pkg.PriceTriple ?? pkg.priceTriple),
    double: toNumber(pkg.PriceDouble ?? pkg.priceDouble),
  };
  // The provider sends the trip length as `NightsCount` (there is no
  // `Nights` field) — reading the wrong key silently left every package's
  // duration/nights badge at 0.
  const nights = toNumber(
    pkg.NightsCount ?? pkg.nightsCount ?? pkg.Nights ?? pkg.nights,
  );

  const departureDate = pkg.DepartureDate || pkg.departureDate || travelDate;
  const arrivalDate = pkg.ArrivalDate || pkg.arrivalDate || travelDate;
  const departureSectorFrom =
    pkg.DepartureSectorFrom || pkg.departureSectorFrom || routeStart;
  const departureSectorTo =
    pkg.DepartureSectorTo || pkg.departureSectorTo || routeEnd;
  const arrivalSectorFrom =
    pkg.ArrivalSectorFrom || pkg.arrivalSectorFrom || routeEnd;
  const arrivalSectorTo =
    pkg.ArrivalSectorTo || pkg.arrivalSectorTo || routeStart;

  return {
    ...pkg,
    _id: packageId,
    id: packageId,
    externalId: packageId,
    packageSource: FULL_UMRAH_PACKAGE_SOURCE,
    source: FULL_UMRAH_PACKAGE_SOURCE,
    packageName: pkg.PackageTitle || pkg.packageTitle || "Umrah Package",
    createdAt: travelDate,
    internalStatus: "Public",
    availableRooms: toNumber(pkg.AvailableSeats ?? pkg.availableSeats),
    days: nights,
    nightCount: nights,
    logo: toAbsoluteUrl(pkg.AirlineLogo || pkg.airlineLogo),
    flightLogo: toAbsoluteUrl(pkg.AirlineLogo || pkg.airlineLogo),
    // Two legs — outbound and return — so the return date/flight number
    // shown to the user comes from the actual arrival leg instead of being
    // duplicated from the departure date.
    flights: [
      {
        airline,
        flightNo: pkg.DepartureFligntNo || pkg.departureFlightNo || "",
        depDate: departureDate,
        arrDate: departureDate,
        sectorFrom: departureSectorFrom,
        sectorTo: departureSectorTo,
        baggage: pkg.DepartureBaggage || pkg.departureBaggage || "",
      },
      {
        airline,
        flightNo: pkg.ArrivalFligntNo || pkg.arrivalFlightNo || "",
        depDate: arrivalDate,
        arrDate: arrivalDate,
        sectorFrom: arrivalSectorFrom,
        sectorTo: arrivalSectorTo,
        baggage: pkg.ArrivalBaggage || pkg.arrivalBaggage || "",
      },
    ],
    hotels: [
      ...(pkg.MakkahHotel || pkg.makkahHotel
        ? [
            {
              name: pkg.MakkahHotel || pkg.makkahHotel,
              location: {
                city: "Makkah",
                distance:
                  pkg.MakkahHotelDistance || pkg.makkahHotelDistance || "",
              },
              nightCount: toNumber(pkg.MakkahNights ?? pkg.makkahNights),
            },
          ]
        : []),
      ...(pkg.MadinahHotel || pkg.madinahHotel
        ? [
            {
              name: pkg.MadinahHotel || pkg.madinahHotel,
              location: {
                city: "Madinah",
                distance:
                  pkg.MedinahHotelDistance || pkg.medinahHotelDistance || "",
              },
              nightCount: toNumber(
                pkg.MadinahNights ??
                  pkg.madinahNights ??
                  pkg.MedinahNights ??
                  pkg.medinahNights,
              ),
            },
          ]
        : []),
    ],
    transports: [],
    rooms: {},
    packageTotals,
    originalPackageTotals: packageTotals,
    rawPackageData: pkg,
  };
};

export const fetchFullUmrahPackages = async () => {
  const now = Date.now();
  if (packagesCache && now - packagesCacheAt < CACHE_TTL_MS)
    return packagesCache;

  try {
    const response = await axios.get(`${getBaseUrl()}/PackagesData.ashx`, {
      timeout: 15000,
    });
    const rawPackages = Array.isArray(response.data)
      ? response.data
      : response.data?.data || response.data?.packages || [];
    packagesCache = rawPackages.map(normalizePackage).filter((pkg) => pkg._id);
    packagesCacheAt = now;
    return packagesCache;
  } catch (error) {
    console.error(
      "Error fetching Full Umrah Package packages:",
      error.response?.data || error.message,
    );
    return packagesCache || [];
  }
};

export const fetchFullUmrahPackageById = async (packageId) => {
  const packages = await fetchFullUmrahPackages();
  return (
    packages.find((pkg) => String(pkg.externalId) === String(packageId)) || null
  );
};
