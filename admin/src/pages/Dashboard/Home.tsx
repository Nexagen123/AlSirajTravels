import PageMeta from "../../components/common/PageMeta";
import { ArrowRightIcon, Squares2X2Icon, HomeIcon, UserGroupIcon, CurrencyRupeeIcon, DocumentDuplicateIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router";
import AgentStatusChart from "../../components/charts/AgentStatusChart";
import { useEffect, useState } from "react";
import axiosInstance from "../../Api/axios";
import { Modal } from "../../components/ui/modal";
import { getRecentBookings } from "../../Api/bookingApi";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";

// ALL YOUR EXISTING INTERFACES, FUNCTIONS, AND CONSTANTS - UNCHANGED
interface UnifiedGroup {
  id: string;
  source: string;
  sector: string;
  type: string;
  available_no_of_pax: number;
  price: number;
  dept_date: string;
  airline: {
    airline_name: string;
    short_name: string;
    logo_url: string | null;
  };
  pnr: string;
}

const MONTHS_TITLE = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DASHBOARD_CATEGORIES = [
  {
    title: "All Groups",
    description: "Browse every active sector in one place.",
    category: "all",
    accentClass: "bg-[#163b73]",
    badgeClass: "bg-blue-50 text-[#163b73] border-blue-100",
  },
  {
    title: "UAE",
    description: "One-way UAE inventory.",
    category: "uae",
    accentClass: "bg-[#2e5fa3]",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-100",
  },
  {
    title: "KSA",
    description: "Saudi group departures.",
    category: "ksa",
    accentClass: "bg-[#2f6b4f]",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    title: "Kuwait (KWI)",
    description: "Kuwait and Muscat routing.",
    category: "kuwait",
    accentClass: "bg-[#536471]",
    badgeClass: "bg-gray-50 text-gray-700 border-gray-100",
  },
  {
    title: "Umrah Groups",
    description: "Seats-only Umrah groups.",
    category: "umrah",
    accentClass: "bg-[#eab022]",
    badgeClass: "bg-yellow-50 text-yellow-800 border-yellow-100",
  },
];

function trimTime(t: string): string {
  if (!t) return "";
  return t.slice(0, 5);
}

function extractIATA(terminal: string): string {
  if (!terminal) return "";
  const match = terminal.match(/\(([A-Z]{3})\)/);
  return match ? match[1] : terminal.trim();
}

function buildCopyText(groups: UnifiedGroup[]): string {
  if (!groups.length) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const header = `                *=====${String(today.getDate()).padStart(2, "0")} ${MONTHS_TITLE[today.getMonth()].toUpperCase()} UPDATES=====*`;

  type SectorEntry = {
    group: any;
    date: Date;
    price: number;
    lines: string[];
  };

  const sectorMap = new Map<string, SectorEntry[]>();
  const sectorOrder: string[] = [];

  groups.forEach((g: any) => {
    if (g.available_no_of_pax !== undefined && g.available_no_of_pax <= 0) return;

    const sector = g.sector || "UNKNOWN";
    const price = Number(g.price || 0);

    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, []);
      sectorOrder.push(sector);
    }

    const flightLines: string[] = [];
    let sortingDate: Date | null = null;

    if (Array.isArray(g.details) && g.details.length > 0) {
      g.details.forEach((d: any, index: number) => {
        const rawDate = d.dep_date || d.flight_date || g.dept_date;
        if (!rawDate) return;

        const date = new Date(rawDate);
        if (isNaN(date.getTime())) return;

        const depDay = new Date(date);
        depDay.setHours(0, 0, 0, 0);

        if (depDay < today) return;

        if (!sortingDate) {
          sortingDate = date;
        }

        const dd = String(date.getDate()).padStart(2, "0");
        const mon = MONTHS_TITLE[date.getMonth()];
        const year = date.getFullYear();

        const flightNo = (d.flight_no || d.flightNo || "").toUpperCase();
        const origin = extractIATA(d.origin || d.from || "");
        const dest = extractIATA(d.destination || d.to || "");

        const depTime = trimTime(d.dept_time || d.dep_time || d.depTime || "");
        const arvTime = trimTime(d.arv_time || d.arr_time || d.arrTime || "");

        const depPart = depTime ? ` (${depTime})` : "";
        const arvPart = arvTime ? ` (${arvTime})` : "";

        const pricePart = index === 0 ? `..... *PKR ${price}*` : "";

        const line = `${flightNo} *${dd} ${mon} ${year}* ${origin}${depPart} ${dest}${arvPart}${pricePart}`;

        flightLines.push(line);
      });

      if (flightLines.length > 0 && sortingDate) {
        sectorMap.get(sector)!.push({
          group: g,
          date: sortingDate,
          price,
          lines: flightLines,
        });
      }

    } else {
      const rawDate = g.dept_date;
      if (!rawDate) return;

      const date = new Date(rawDate);
      if (isNaN(date.getTime())) return;

      const depDay = new Date(date);
      depDay.setHours(0, 0, 0, 0);
      if (depDay < today) return;

      const dd = String(date.getDate()).padStart(2, "0");
      const mon = MONTHS_TITLE[date.getMonth()];
      const year = date.getFullYear();

      const code = g.airline?.short_name || "";
      const sec = (g.sector || "").replace(/-/g, " ");

      const line = `${code} *${dd} ${mon} ${year}* ${sec}..... *PKR ${price}*`;

      sectorMap.get(sector)!.push({
        group: g,
        date,
        price,
        lines: [line],
      });
    }
  });

  sectorMap.forEach((entries) => {
    entries.sort((a, b) => {
      const timeDiff = a.date.getTime() - b.date.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.price - b.price;
    });
  });

  const lines: string[] = [];

  sectorOrder.forEach((sector) => {
    const entries = sectorMap.get(sector)!;

    entries.forEach((entry) => {
      entry.lines.forEach((line) => {
        lines.push(line);
      });
    });
  });

  const footer =
    `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*
=======================
New Al Siraj Travel
Mobile: 0306-6001334
Address: Plaza 44 First Floor Main Boulevard Garden Town Phase 3, Gujranwala
Website: https://qaflaesagirb2bportal.qaflaesagir.com/`;

  return [header, ...lines, "=======================", footer].join("\n");
}

interface RecentBooking {
  _id: string;
  bookingReference: string;
  contactPersonName: string;
  sector: string;
  status: string;
  totalPassengers: number;
  pricing: {
    grandTotal: number;
  };
  departureDate: string;
  createdAt: string;
  airline?: {
    name?: string;
    airline_name?: string;
  };
}

export default function Home() {
  // ALL YOUR EXISTING STATE AND HOOKS - UNCHANGED
  const { user } = useAuth();
  const [unifiedGroups, setUnifiedGroups] = useState<UnifiedGroup[]>([]);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [copied, setCopied] = useState(false);
  const [isMarginModalOpen, setIsMarginModalOpen] = useState(false);
  const [marginValue, setMarginValue] = useState("");
  const [marginType, setMarginType] = useState<"percent" | "amount">("percent");
  const [isApplyingMargin, setIsApplyingMargin] = useState(false);
  const [currentMargin, setCurrentMargin] = useState<{ value: number; type: "percent" | "amount" } | null>(null);

  // ALL YOUR EXISTING FUNCTIONS - UNCHANGED
  const fetchUnifiedGroups = async () => {
    try {
      const response = await axiosInstance.get("/sector/getUnifiedGroups");
      if (response.data.success && Array.isArray(response.data.data)) {
        setUnifiedGroups(response.data.data);
      } else {
        console.warn("Data format matches but array not found or success is false");
      }
    } catch (error: any) {
      console.error("Error fetching unified groups:", error);
    }
  };

  const fetchMargin = async () => {
    try {
      const response = await axiosInstance.get("/sector/getMargin");
      if (response.data.success) {
        setCurrentMargin({
          value: response.data.data.value,
          type: response.data.data.type,
        });
      }
    } catch (error: any) {
      console.error("Error fetching margin:", error);
    }
  };

  const fetchRecentBookings = async () => {
    try {
      const response = await getRecentBookings(5);
      if (response.success && Array.isArray(response.data)) {
        setRecentBookings(response.data);
      }
    } catch (error: any) {
      console.error("Error fetching recent bookings:", error);
    }
  };

  const handleCopyData = async () => {
    const text = buildCopyText(unifiedGroups);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleApplyMargin = async () => {
    if (!marginValue || marginValue < "0") {
      alert("Please enter a valid margin value");
      return;
    }

    setIsApplyingMargin(true);
    try {
      const payload = {
        value: parseFloat(marginValue),
        type: marginType,
      };

      const response = await axiosInstance.post("/sector/applyMargin", payload);

      if (response.data.success) {
        alert(`Margin saved: ${marginValue} ${marginType === "percent" ? "%" : "Rs"}`);
        setIsMarginModalOpen(false);
        setMarginValue("");
        setMarginType("percent");
        fetchMargin();
      } else {
        alert(response.data.message || "Failed to save margin");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Error saving margin");
      console.error("Error saving margin:", error);
    } finally {
      setIsApplyingMargin(false);
    }
  };

  // ALL YOUR EXISTING USEFFECT - UNCHANGED
  useEffect(() => {
    if (!hasPermission(user, "view_dashboard")) return;

    if (hasPermission(user, "dashboard_copy_sector_data")) {
      fetchUnifiedGroups();
    }

    if (hasPermission(user, "dashboard_apply_margin")) {
      fetchMargin();
    }

    if (hasPermission(user, "dashboard_recent_bookings")) {
      fetchRecentBookings();
    }
  }, [user]);

  return (
    <>
      <PageMeta
        title="Dashboard | New Al Siraj Travel"
        description="Dashboard overview for New Al Siraj Travel"
      />

      {hasPermission(user, "view_dashboard") &&
        <>
          <div className="clay-admin-page -m-4 min-h-[calc(100vh-96px)] p-4 sm:-m-6 sm:p-6">
            <div className="relative mb-5 overflow-hidden clay-admin-navy p-4 sm:p-5">
              <div
                className="absolute inset-0 opacity-[0.08] pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
              />

              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-white/70">
                    <HomeIcon className="h-4 w-4 text-[var(--clay-gold-light)]" />
                    <span>Dashboard</span>
                  </div>
                  <h1 className="text-2xl font-black text-white sm:text-3xl">
                    New Al Siraj Admin
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm text-white/75">
                    Monitor bookings, group inventory, margins, and agent activity from one work-focused view.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                  {hasPermission(user, "dashboard_copy_sector_data") && (
                    <button
                      onClick={handleCopyData}
                      disabled={unifiedGroups.length === 0}
                      className={`clay-admin-btn inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-bold transition ${unifiedGroups.length === 0
                        ? 'bg-white/10 text-white/45 cursor-not-allowed'
                        : copied
                          ? 'bg-emerald-500 text-white shadow-theme-sm'
                          : 'clay-admin-gold text-[var(--clay-navy-dark)]'
                        }`}
                    >
                      {copied ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <DocumentDuplicateIcon className="w-5 h-5" />
                          Copy ({unifiedGroups.length})
                        </>
                      )}
                    </button>
                  )}

                  {hasPermission(user, "dashboard_apply_margin") && (
                    <button
                      onClick={() => setIsMarginModalOpen(true)}
                      className="clay-admin-btn inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/12 px-3.5 py-2.5 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/18"
                    >
                      <CurrencyRupeeIcon className="w-5 h-5" />
                      Apply Margin
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="clay-admin-panel p-4">
                <p className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400">Groups Loaded</p>
                <p className="mt-1 text-2xl font-black text-[var(--clay-navy)] dark:text-white">{unifiedGroups.length}</p>
              </div>
              <div className="clay-admin-panel p-4">
                <p className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400">Recent Bookings</p>
                <p className="mt-1 text-2xl font-black text-[var(--clay-navy)] dark:text-white">{recentBookings.length}</p>
              </div>
              <div className="clay-admin-panel p-4">
                <p className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400">Current Margin</p>
                <p className="mt-1 text-2xl font-black text-[var(--clay-navy)] dark:text-white">
                  {currentMargin && currentMargin.value > 0 ? `${currentMargin.value}${currentMargin.type === "percent" ? "%" : " PKR"}` : "None"}
                </p>
              </div>
              <div className="clay-admin-panel p-4">
                <p className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400">Quick Access</p>
                <p className="mt-1 text-2xl font-black text-[var(--clay-navy)] dark:text-white">{DASHBOARD_CATEGORIES.length}</p>
              </div>
            </div>

            {hasPermission(user, "dashboard_group_category") && (
              <div className="mb-5">
                <div className="mb-3">
                  <h2 className="text-base font-black text-[var(--clay-navy)] dark:text-white">Group Categories</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fast routes into the live ticketing inventory.</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {DASHBOARD_CATEGORIES.map((category) => {
                    const target = category.category === "all"
                      ? "/local-groups"
                      : `/local-groups?category=${encodeURIComponent(category.category === "kuwait" ? "muscat" : category.category)}`;

                    return (
                      <div
                        key={category.title}
                        className="group clay-admin-panel overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-theme-md"
                      >
                        <div className={`h-1.5 ${category.accentClass}`} />
                        <div className="p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--clay-bg)] text-[var(--clay-navy)]">
                                <Squares2X2Icon className="h-5 w-5" />
                              </div>
                              <span className="text-sm font-black text-gray-900 dark:text-white">{category.title}</span>
                            </div>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${category.badgeClass}`}>
                              {category.category}
                            </span>
                          </div>
                          <p className="min-h-8 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{category.description}</p>
                          <div className="flex items-center gap-2">
                            <Link
                              to={target}
                              className="clay-admin-btn flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--clay-navy)] px-3 py-2 text-xs font-bold text-white"
                            >
                              <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                              View
                            </Link>
                            {category.category !== "all" && (
                              <Link
                                to={`group-ticketing/create`}
                                onClick={(e) => e.stopPropagation()}
                                className="clay-admin-btn flex items-center justify-center gap-1.5 rounded-full clay-admin-gold px-3 py-2 text-xs font-black text-[var(--clay-navy-dark)]"
                              >
                                <PlusIcon className="w-3 h-3" />
                                Add
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {hasPermission(user, "dashboard_recent_bookings") && (
              <div className="mb-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-[var(--clay-navy)] dark:text-white">Recent Bookings</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Latest 5 bookings.</p>
                  </div>
                  <Link
                    to="/all-bookings"
                    className="clay-admin-btn inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-[var(--clay-navy)] hover:border-[var(--clay-gold)] dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    View All
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {recentBookings.length === 0 ? (
                  <div className="clay-admin-panel p-8 text-center">
                    <DocumentDuplicateIcon className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No recent bookings</p>
                  </div>
                ) : (
                  <div className="clay-admin-panel overflow-hidden">
                    {recentBookings.map((booking, index) => {
                      const statusColors = {
                        "on hold": "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
                        "confirmed": "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
                        "cancelled": "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
                        "processing": "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
                      };
                      const statusClass = statusColors[booking.status as keyof typeof statusColors] || "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";

                      return (
                        <Link
                          key={booking._id}
                          to={`/all-bookings`}
                          className={`group block p-4 transition hover:bg-[var(--clay-bg)]/70 dark:hover:bg-white/5 ${index !== recentBookings.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}`}
                        >
                          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto_auto] md:items-center">
                            <div className="min-w-0">
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="truncate text-sm font-black text-gray-900 dark:text-white">
                                  {booking.bookingReference}
                                </span>
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${statusClass}`}>
                                  {booking.status}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1.5">
                                  <UserGroupIcon className="h-4 w-4" />
                                  {booking.contactPersonName}
                                </span>
                                <span>{booking.totalPassengers} PAX</span>
                              </div>
                            </div>

                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase text-gray-400">Sector</p>
                              <p className="truncate text-sm font-bold text-gray-800 dark:text-white">{booking.sector}</p>
                              {booking.airline && (
                                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                  {booking.airline.airline_name || booking.airline.name}
                                </p>
                              )}
                            </div>

                            <div className="text-left md:text-right">
                              <p className="text-[10px] font-bold uppercase text-gray-400">Total</p>
                              <p className="text-base font-black text-[var(--clay-navy)] dark:text-white">
                                PKR {booking.pricing.grandTotal.toLocaleString()}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-3 md:justify-end">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {new Date(booking.departureDate).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                              <ArrowRightIcon className="h-4 w-4 text-[var(--clay-gold-dark)] opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {hasPermission(user, "dashboard_agent_status_graph") && (
              <div className="mb-2">
                <div className="clay-admin-panel p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black text-[var(--clay-navy)] dark:text-white">Agent Performance</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Real-time agent status overview.</p>
                    </div>
                    <div className="hidden rounded-full bg-[var(--clay-bg)] px-3 py-1 text-[10px] font-black uppercase text-[var(--clay-navy)] sm:block">
                      Live Status
                    </div>
                  </div>
                  <AgentStatusChart />
                </div>
              </div>
            )}

            {/* Apply Margin Modal - MODERN DESIGN */}
            <Modal
              isOpen={isMarginModalOpen}
              onClose={() => {
                setIsMarginModalOpen(false);
                setMarginValue("");
                setMarginType("percent");
              }}
              className="max-w-md"
            >
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="clay-admin-gold rounded-lg p-2.5 text-[var(--clay-navy-dark)]">
                    <CurrencyRupeeIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[var(--clay-navy)] dark:text-white">Apply Margin</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Add margin to all group prices</p>
                  </div>
                </div>

                {currentMargin && currentMargin.value > 0 && (
                  <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      <strong className="font-semibold">Current Margin:</strong> {currentMargin.value} {currentMargin.type === "percent" ? "%" : "Rs"}
                    </p>
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Margin Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition-all duration-200 ${marginType === "percent"
                        ? "border-[var(--clay-navy)] bg-[var(--clay-bg)] dark:bg-blue-900/20 dark:border-blue-400"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}>
                        <input
                          type="radio"
                          name="marginType"
                          value="percent"
                          checked={marginType === "percent"}
                          onChange={(e) => setMarginType(e.target.value as "percent" | "amount")}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Percentage (%)</span>
                      </label>
                      <label className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition-all duration-200 ${marginType === "amount"
                        ? "border-[var(--clay-navy)] bg-[var(--clay-bg)] dark:bg-blue-900/20 dark:border-blue-400"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}>
                        <input
                          type="radio"
                          name="marginType"
                          value="amount"
                          checked={marginType === "amount"}
                          onChange={(e) => setMarginType(e.target.value as "percent" | "amount")}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fixed Amount (PKR )</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Margin Value
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={marginValue}
                        onChange={(e) => setMarginValue(e.target.value)}
                        placeholder={marginType === "percent" ? "Enter percentage (e.g., 5)" : "Enter amount (e.g., 500)"}
                        className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-[var(--clay-gold)] focus:outline-none focus:ring-2 focus:ring-yellow-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                      />
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                        {marginType === "percent" ? "%" : "PKR "}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200 sm:text-sm">
                      This margin will be applied at the frontend when displaying prices.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => {
                      setIsMarginModalOpen(false);
                      setMarginValue("");
                      setMarginType("percent");
                    }}
                    className="flex-1 rounded-lg border-2 border-gray-200 px-4 py-3 font-bold text-gray-700 transition-all duration-200 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    disabled={isApplyingMargin}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyMargin}
                    disabled={isApplyingMargin || !marginValue}
                    className="clay-admin-btn flex-1 rounded-lg bg-[var(--clay-navy)] px-4 py-3 font-bold text-white transition-all duration-200 hover:bg-[var(--clay-navy-dark)] disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
                  >
                    {isApplyingMargin ? "Saving..." : "Save Margin"}
                  </button>
                </div>
              </div>
            </Modal>
          </div>
        </>
      }
    </>
  );
}
