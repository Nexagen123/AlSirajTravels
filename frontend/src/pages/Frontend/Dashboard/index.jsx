import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Compass,
  Gift,
  Globe2,
  Landmark,
  MapPinned,
  PackageCheck,
  Plane,
  Sparkles,
  TicketCheck,
  XCircle,
} from "lucide-react";
import axiosInstance from "../../../api/axios";
import { groupTypes } from "../../../data/groupTypes";

import madinaImg from "../../../assets/images/allgroupsbgg.jpg";
import uaeImg from "../../../assets/images/uaebg.jpg";
import jeddahImg from "../../../assets/images/jeddah.webp";
import mascatImg from "../../../assets/images/muscatbg.jpg";
import makkahImg from "../../../assets/images/ummrahbg.png";
import bakuImg from "../../../assets/images/qatar.jpg";

const groupImages = {
  "All Groups": madinaImg,
  "UAE (United Arab Emirates)": uaeImg,
  "KSA Groups": jeddahImg,
  "Kuwait (KWI)": mascatImg,
  "Umrah Groups (Only Seats)": makkahImg,
  "Umrah Packages": makkahImg,
  "Baku Packages": bakuImg,
};

const groupStyles = {
  "All Groups": {
    accent:
      "linear-gradient(135deg,var(--clay-navy-light),var(--clay-navy-dark))",
    icon: Globe2,
    tag: "All routes",
  },
  "UAE (United Arab Emirates)": {
    accent: "linear-gradient(135deg,#f59e0b,#e11d48)",
    icon: MapPinned,
    tag: "UAE seats",
  },
  "KSA Groups": {
    accent: "linear-gradient(135deg,#059669,#0f766e)",
    icon: Compass,
    tag: "KSA one way",
  },
  "Kuwait (KWI)": {
    accent: "linear-gradient(135deg,#7c3aed,#2563eb)",
    icon: Plane,
    tag: "KWI groups",
  },
  "Baku Packages": {
    accent: "linear-gradient(135deg,#0891b2,#2563eb)",
    icon: MapPinned,
    tag: "Tour",
  },
  "Umrah Groups (Only Seats)": {
    accent: "linear-gradient(135deg,#be123c,#f97316)",
    icon: Landmark,
    tag: "Only seats",
  },
  "Umrah Packages": {
    accent:
      "linear-gradient(135deg,var(--clay-gold-dark),var(--clay-gold-light))",
    icon: PackageCheck,
    tag: "Packages",
  },
};

const Dashboard = () => {
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    confirmed: 0,
    hold: 0,
    cancelled: 0,
  });
  const [indexCards, setIndexCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [cardsError, setCardsError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const totalBookings = summary.confirmed + summary.hold + summary.cancelled;

  const statCards = useMemo(
    () => [
      {
        label: "Confirmed Bookings",
        value: summary.confirmed,
        Icon: CircleCheck,
        gradient: "linear-gradient(135deg,#047857,#10b981)",
        shadow: "rgba(4,120,87,0.24)",
      },
      {
        label: "Hold Tickets",
        value: summary.hold,
        Icon: Clock3,
        gradient: "linear-gradient(135deg,#b45309,#f59e0b)",
        shadow: "rgba(180,83,9,0.24)",
      },
      {
        label: "Cancelled",
        value: summary.cancelled,
        Icon: XCircle,
        gradient: "linear-gradient(135deg,#b91c1c,#ef4444)",
        shadow: "rgba(185,28,28,0.22)",
      },
    ],
    [summary],
  );

  const heroStats = useMemo(
    () => [
      { label: "Total", value: totalBookings, Icon: TicketCheck },
      {
        label: "Offers",
        value: loadingCards ? "-" : indexCards.length,
        Icon: Gift,
      },
      { label: "Routes", value: groupTypes.length, Icon: Plane },
    ],
    [totalBookings, loadingCards, indexCards.length],
  );

  useEffect(() => {
    const fetchUserBookings = async () => {
      try {
        const res = await axiosInstance.get("/bookings");
        if (res.data.success && Array.isArray(res.data.data)) {
          const bookings = res.data.data;
          const confirmed = bookings.filter(
            (b) => b.status === "confirmed",
          ).length;
          const hold = bookings.filter(
            (b) => b.status === "on hold" || b.status === "pending",
          ).length;
          const cancelled = bookings.filter(
            (b) => b.status === "cancelled",
          ).length;
          setSummary({ confirmed, hold, cancelled });
        }
      } catch (err) {
        setSummary({ confirmed: 0, hold: 0, cancelled: 0 });
      }
    };
    fetchUserBookings();
  }, []);

  useEffect(() => {
    const fetchIndexCards = async () => {
      setLoadingCards(true);
      setCardsError(null);
      try {
        const res = await axiosInstance.get("/specialOffer/getSpecialOffers");
        if (res.data.success) {
          setIndexCards(res.data.data);
        } else {
          setIndexCards([]);
        }
      } catch (err) {
        console.error(err);
        setCardsError("Failed to load offers.");
      } finally {
        setLoadingCards(false);
      }
    };
    fetchIndexCards();
  }, []);

  useEffect(() => {
    if (indexCards.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) =>
        prev === indexCards.length - 1 ? 0 : prev + 1,
      );
    }, 4200);
    return () => clearInterval(interval);
  }, [indexCards]);

  const handleCategoryClick = (group) => {
    navigate(`/dashboard/${group.path}`);
  };

  const nextSlide = () => {
    if (indexCards.length === 0) return;
    setCurrentIndex((prev) => (prev === indexCards.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    if (indexCards.length === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? indexCards.length - 1 : prev - 1));
  };

  const activeOffer = indexCards[currentIndex];

  return (
    <>
      <style>{`
        @keyframes dashboard-marquee {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        @keyframes dashboard-rise {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dashboard-marquee {
          display: inline-block;
          animation: dashboard-marquee 30s linear infinite;
          white-space: nowrap;
        }
        .dashboard-rise {
          animation: dashboard-rise 0.55s ease both;
        }
      `}</style>

      <div
        className="w-full overflow-hidden relative flex items-center py-2.5"
        style={{
          background:
            "linear-gradient(90deg,#0e2952 0%,#163b73 48%,#2e5fa3 100%)",
          boxShadow: "0 8px 24px rgba(14,41,82,0.25)",
        }}
      >
        <span className="shrink-0 ml-4 mr-3 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-(--clay-gold-light) opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-(--clay-gold-light)" />
          </span>
          <span className="text-white/85 text-xs font-bold uppercase tracking-widest">
            Live
          </span>
        </span>
        <div className="flex-1 overflow-hidden">
          <span className="dashboard-marquee text-white text-sm font-medium tracking-wide">
            Welcome to New Al Siraj Travels - We book comfort for you - Latest
            Umrah, UAE, KSA and Kuwait seats are waiting - Book smarter and
            travel with confidence
          </span>
        </div>
      </div>

      <div
        className="w-full min-h-screen px-4 md:px-8 pb-14 pt-6"
        style={{ background: "var(--clay-bg)" }}
      >
        {/* ══════════ HERO BANNER ══════════ */}
        <section className="dashboard-rise relative overflow-hidden bg-linear-to-br from-(--clay-navy-light) via-(--clay-navy) to-(--clay-navy-dark) rounded-[1.75rem] p-6 md:p-10 mb-8 text-white">
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="absolute -top-14 -right-14 w-72 h-72 rounded-full bg-(--clay-gold) opacity-20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 -left-16 w-56 h-56 rounded-full bg-(--clay-navy-light) opacity-30 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto] items-center">
            <div>
              <div className="clay-glass-light inline-flex items-center gap-2 px-3.5 py-1.5 mb-4">
                <Sparkles size={13} className="text-(--clay-gold-light)" />
                <span className="text-[11px] font-bold uppercase tracking-widest">
                  Agent Dashboard
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black leading-tight">
                Manage bookings with clarity and speed.
              </h1>
              <p className="mt-3 max-w-xl text-sm md:text-base text-white/75 leading-relaxed">
                Track ticket status, open destination groups, and keep special
                offers visible for quick customer decisions.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-4">
              {heroStats.map(({ label, value, Icon }) => (
                <div
                  key={label}
                  className="clay-glass-light rounded-2xl! px-4 py-4 text-center min-w-21.5"
                >
                  <Icon
                    size={20}
                    className="mx-auto text-(--clay-gold-light)"
                  />
                  <div className="mt-2 text-2xl font-black">{value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ STAT STRIP ══════════ */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 mb-10">
          {statCards.map(({ label, value, Icon, gradient, shadow }, index) => {
            const progress =
              totalBookings === 0
                ? 0
                : Math.min((value / totalBookings) * 100, 100);

            return (
              <div
                key={label}
                className="dashboard-rise clay-white clay-btn relative flex items-center gap-4 p-5"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white"
                  style={{
                    background: gradient,
                    boxShadow: `0 10px 24px ${shadow}`,
                  }}
                >
                  <Icon size={22} strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-3xl font-black leading-none text-(--clay-navy)">
                    {value}
                  </div>
                  <div className="mt-1.5 text-xs font-bold uppercase tracking-widest text-gray-400">
                    {label}
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${progress}%`, background: gradient }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* ══════════ DESTINATION GROUPS ══════════ */}
        <section className="mb-10">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="h-px w-8 bg-(--clay-gold-dark)" />
                <span className="text-(--clay-gold-dark) text-xs font-black uppercase tracking-widest">
                  Explore
                </span>
              </div>
              <h2 className="text-2xl font-black text-(--clay-navy)">
                Destination Groups
              </h2>
            </div>
            <span className="text-sm font-semibold text-gray-400">
              {groupTypes.length} active categories
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {groupTypes.map((group, index) => {
              const style =
                groupStyles[group.label] ?? groupStyles["All Groups"];
              const GroupIcon = style.icon;

              return (
                <button
                  type="button"
                  key={group.value || group.path}
                  onClick={() => handleCategoryClick(group)}
                  className="dashboard-rise group clay-white clay-btn p-3 text-left"
                  style={{ animationDelay: `${index * 0.06}s` }}
                  aria-label={`Open ${group.label}`}
                >
                  <div className="clay-well relative h-48 sm:h-56 overflow-hidden">
                    <img
                      style={{ height: "100%" }}
                      src={groupImages[group.label]}
                      alt={group.label}
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-(--clay-navy-dark)/70 via-black/10 to-transparent" />
                    <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-white/14 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md">
                      {style.tag}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3 px-1">
                    <span
                      className="w-11 h-11 shrink-0 rounded-full! flex items-center justify-center text-white"
                      style={{ background: style.accent }}
                    >
                      <GroupIcon size={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="block text-(--clay-navy) font-black text-base leading-tight">
                        {group.label}
                      </span>
                      <span className="block text-gray-400 text-xs font-semibold mt-0.5">
                        View available seats
                      </span>
                    </div>
                    <ArrowRight
                      size={18}
                      className="text-(--clay-navy-light) shrink-0 transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ══════════ SPECIAL DEALS SHOWCASE ══════════ */}
        <section>
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="h-px w-8 bg-(--clay-gold-dark)" />
                <span className="text-(--clay-gold-dark) text-xs font-black uppercase tracking-widest">
                  Offers
                </span>
              </div>
              <h2 className="text-2xl font-black text-(--clay-navy)">
                Special Deals
              </h2>
            </div>
            {!loadingCards && indexCards.length > 0 && (
              <span className="clay-navy rounded-full! px-3 py-1 text-xs font-bold text-white">
                {indexCards.length} Live
              </span>
            )}
          </div>

          {loadingCards ? (
            <div className="clay-white overflow-hidden grid md:grid-cols-2">
              <div className="h-64 md:h-80 bg-gray-200 animate-pulse" />
              <div className="p-6 md:p-8 space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/5" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-2/5" />
              </div>
            </div>
          ) : cardsError ? (
            <div className="rounded-[1.75rem] border border-red-200 bg-red-50 p-6 text-center text-sm font-semibold text-red-600 shadow-sm">
              <AlertCircle className="mx-auto mb-3" size={26} />
              {cardsError}
            </div>
          ) : indexCards.length === 0 ? (
            <div className="clay-white border border-dashed border-gray-300 p-10 text-center text-sm font-semibold text-gray-500">
              <Gift className="mx-auto mb-3 text-gray-400" size={28} />
              No special offers right now.
              <span className="block text-gray-400">Check back soon.</span>
            </div>
          ) : (
            <div className="clay-white overflow-hidden grid md:grid-cols-2">
              <div className="relative h-64 md:h-auto overflow-hidden">
                <img
                  key={activeOffer?._id || currentIndex}
                  src={activeOffer?.image}
                  alt={activeOffer?.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-(--clay-navy-dark)/60 via-transparent to-transparent md:bg-linear-to-r" />
                <div className="absolute bottom-4 left-4 clay-glass-light inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white">
                  <Sparkles size={13} />
                  Featured Offer
                </div>
              </div>

              <div className="p-6 md:p-8 flex flex-col justify-center gap-4">
                <h3 className="text-2xl font-black leading-snug text-(--clay-navy)">
                  {activeOffer?.title}
                </h3>

                <div className="flex items-center gap-2 text-sm font-semibold text-gray-400">
                  <CalendarDays size={16} />
                  {activeOffer?.createdAt
                    ? new Date(activeOffer.createdAt).toLocaleDateString(
                        "en-US",
                        { year: "numeric", month: "short", day: "numeric" },
                      )
                    : "Recently added"}
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={prevSlide}
                      className="clay-btn grid h-10 w-10 place-items-center rounded-full! text-white"
                      style={{
                        background:
                          "linear-gradient(145deg, var(--clay-navy-light), var(--clay-navy-dark))",
                      }}
                      aria-label="Previous offer"
                    >
                      <ChevronLeft size={19} />
                    </button>
                    <button
                      type="button"
                      onClick={nextSlide}
                      className="clay-btn grid h-10 w-10 place-items-center rounded-full! text-white"
                      style={{
                        background:
                          "linear-gradient(145deg, var(--clay-navy-light), var(--clay-navy-dark))",
                      }}
                      aria-label="Next offer"
                    >
                      <ChevronRight size={19} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {indexCards.map((offer, index) => (
                      <button
                        type="button"
                        key={offer?._id || index}
                        onClick={() => setCurrentIndex(index)}
                        className="p-0 h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--clay-gold-light)"
                        style={{
                          width: index === currentIndex ? 28 : 8,
                          background:
                            index === currentIndex
                              ? "linear-gradient(90deg,var(--clay-navy-light),var(--clay-gold-dark))"
                              : "#e2e6ee",
                        }}
                        aria-label={`Show offer ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default Dashboard;
