import { useEffect, useState } from "react";
import {
  Plane,
  Moon,
  Shield,
  Bed,
  Map,
  Users,
  Star,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { travelImages } from "../../data/travelImages";

const services = [
  {
    id: 1,
    title: "Air Tickets",
    description:
      "Global flight bookings with premium lounge access and priority boarding, across every major carrier.",
    icon: <Plane size={20} />,
    image: travelImages.flight,
    tag: "Flight",
    rating: 4.9,
  },
  {
    id: 2,
    title: "Umrah Packages",
    description:
      "Spiritual journeys crafted with luxury stays near the Haramain and private transportation throughout.",
    icon: <Moon size={20} />,
    image: travelImages.makkah,
    tag: "Spiritual",
    rating: 4.8,
  },
  {
    id: 3,
    title: "Visa Services",
    description:
      "Fast-track visa processing with a 98% approval rate, handled document-to-stamp for every destination.",
    icon: <Shield size={20} />,
    image: travelImages.passport,
    tag: "Expertise",
    rating: 4.7,
  },
  {
    id: 4,
    title: "Hotel Packages",
    description:
      "Handpicked 5-star hotels at exclusive rates, with complimentary upgrades wherever we can arrange them.",
    icon: <Bed size={20} />,
    image: travelImages.hotel,
    tag: "Comfort",
    rating: 4.9,
  },
  {
    id: 5,
    title: "Travel Consultancy",
    description:
      "Expert itineraries designed around your budget and pace, backed by 24/7 support along the way.",
    icon: <Map size={20} />,
    image: travelImages.airport,
    tag: "Planning",
    rating: 4.6,
  },
  {
    id: 6,
    title: "Meet & Assist",
    description:
      "Seamless airport VIP transfers with a personal concierge on hand for families and larger groups.",
    icon: <Users size={20} />,
    image: travelImages.travelers,
    tag: "VIP",
    rating: 4.9,
  },
];

const promoStats = [
  { num: "50k+", label: "Seats Managed" },
  { num: "12k+", label: "Happy Clients" },
  { num: "98%", label: "Satisfaction" },
];

const AUTO_ADVANCE_MS = 5000;

// ─── Wavy edges — light section above/below dips into the navy panel ──────────
function TopWave() {
  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none overflow-hidden h-10 md:h-14">
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="absolute top-0 w-full h-full"
      >
        <path
          fill="var(--clay-bg)"
          d="M0,0 L0,32 C280,64 480,0 720,16 C960,32 1180,0 1440,24 L1440,0 Z"
        />
      </svg>
    </div>
  );
}

function BottomWave() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden h-10 md:h-14">
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="absolute bottom-0 w-full h-full"
      >
        <path
          fill="white"
          d="M0,80 L0,48 C280,16 480,80 720,64 C960,48 1180,80 1440,56 L1440,80 Z"
        />
      </svg>
    </div>
  );
}

export default function ServicesSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = services.length;

  const goTo = (i) => setActive((i + count) % count);
  const next = () => goTo(active + 1);
  const prev = () => goTo(active - 1);

  // Auto-advance the slide, resets whenever the selection changes
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setActive((a) => (a + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused, active, count]);

  return (
    <section
      className="relative bg-linear-to-br from-(--clay-navy-light) via-(--clay-navy) to-(--clay-navy-dark) overflow-hidden py-20 md:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <TopWave />

      {/* decorative texture */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-(--clay-gold) opacity-15 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-10 pt-6">
        {/* Section header */}
        <div className="text-center mb-12 md:mb-14">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="h-px w-8 bg-(--clay-gold-light)" />
            <span className="text-(--clay-gold-light) text-xs font-bold tracking-[0.3em] uppercase">
              Our Services
            </span>
            <span className="h-px w-8 bg-(--clay-gold-light)" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white">
            Everything Your Journey Needs
          </h2>
          <p className="text-white/60 mt-3 text-base max-w-lg mx-auto">
            From the first flight search to hotel check-in, New Al Siraj keeps
            the moving parts in one place.
          </p>
        </div>

        {/* ── Carousel ── */}
        <div className="relative">
          {/* Prev / Next arrows */}
          <button
            onClick={prev}
            aria-label="Previous service"
            className="clay-btn clay-glass-light hidden sm:flex absolute -left-2 md:-left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full! items-center justify-center text-white"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            aria-label="Next service"
            className="clay-btn clay-glass-light hidden sm:flex absolute -right-2 md:-right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full! items-center justify-center text-white"
          >
            <ChevronRight size={20} />
          </button>

          {/* Track */}
          <div className="overflow-hidden rounded-4xl">
            <div
              className="flex transition-transform duration-700 ease-out"
              style={{
                width: `${count * 100}%`,
                transform: `translateX(-${(active * 100) / count}%)`,
              }}
            >
              {services.map((s) => (
                <div
                  key={s.id}
                  className="shrink-0 flex flex-col md:flex-row items-center gap-8 md:gap-12 px-1"
                  style={{ width: `${100 / count}%` }}
                >
                  {/* Image */}
                  <div className="clay-white p-3 w-full md:w-[46%] shrink-0">
                    <div className="clay-well relative h-64 sm:h-72 md:h-96 overflow-hidden">
                      <img
                        style={{ height: "100%" }}
                        src={s.image}
                        alt={s.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/5 to-transparent" />
                      <span className="clay-gold rounded-full! absolute top-4 left-4 px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-bold text-(--clay-navy-dark)">
                        <Star size={12} className="fill-current" />
                        {s.rating}
                        <span className="opacity-70 font-semibold">
                          · {s.tag}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="w-full md:w-[54%]">
                    <div className="w-14 h-14 rounded-2xl clay-gold flex items-center justify-center mb-5 text-(--clay-navy-dark)">
                      {s.icon}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-white mb-3">
                      {s.title}
                    </h3>
                    <p className="text-white/65 text-base leading-relaxed mb-6 max-w-md">
                      {s.description}
                    </p>
                    <span className="btn-gold inline-flex items-center gap-1.5 text-(--clay-navy-dark) font-bold text-sm px-6 py-3 rounded-full">
                      Explore
                      <ArrowUpRight size={16} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {services.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to service ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  i === active
                    ? "w-7 h-2 bg-(--clay-gold-light)"
                    : "w-2 h-2 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Stats band */}
        <div className="mt-16 md:mt-16 grid grid-cols-3 gap-6 pt-10 border-t border-white/10">
          {promoStats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl md:text-3xl font-black text-(--clay-gold-light)">
                {s.num}
              </p>
              <p className="text-white/50 text-[11px] md:text-xs uppercase tracking-wider mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <BottomWave />
    </section>
  );
}
