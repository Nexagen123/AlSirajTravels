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
    code: "AIR",
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
    code: "UMR",
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
    code: "VSA",
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
    code: "HTL",
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
    code: "PLN",
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
    code: "VIP",
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
  const activeService = services[active];

  const goTo = (i) => setActive((i + count) % count);
  const next = () => goTo(active + 1);
  const prev = () => goTo(active - 1);

  useEffect(() => {
    if (paused) return undefined;

    const timer = setInterval(() => {
      setActive((a) => (a + 1) % count);
    }, AUTO_ADVANCE_MS);

    return () => clearInterval(timer);
  }, [paused, active, count]);

  return (
    <section
      className="relative overflow-hidden bg-(--clay-bg) py-20 md:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-x-0 top-0 h-[58%] bg-linear-to-br from-(--siraj-black) via-(--clay-navy-dark) to-(--clay-navy)" />
      <TopWave />

      <div
        className="absolute inset-x-0 top-0 h-[58%] opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(90deg, white 1px, transparent 1px), linear-gradient(0deg, white 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-10 pt-8">
        <div className="mb-10 grid gap-7 lg:grid-cols-[0.95fr_1fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-(--clay-gold)/35 bg-white px-4 py-2 shadow-sm">
              <Plane size={14} className="text-(--clay-gold-dark)" />
              <span className="text-(--clay-gold-dark) text-[11px] font-black tracking-[0.28em] uppercase">
                Service Desk
              </span>
            </div>
            <h2 className="text-3xl font-black leading-tight text-white md:text-5xl">
              Pick the service. We handle the moving parts.
            </h2>
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white text-(--clay-navy-dark) shadow-sm">
            {promoStats.map((stat) => (
              <div key={stat.label} className="px-4 py-4 text-center">
                <p className="text-2xl font-black text-(--clay-gold-dark)">
                  {stat.num}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[30px] bg-white shadow-[0_28px_70px_rgba(6,24,63,0.18)]">
          <div className="absolute bottom-0 top-0 hidden w-px border-l border-dashed border-slate-300 lg:left-[58%] lg:block" />
          <div className="absolute -top-8 hidden h-16 w-16 rounded-full bg-(--clay-bg) lg:left-[calc(58%_-_2rem)] lg:block" />
          <div className="absolute -bottom-8 hidden h-16 w-16 rounded-full bg-(--clay-bg) lg:left-[calc(58%_-_2rem)] lg:block" />

          <div className="grid lg:grid-cols-[1.38fr_1fr]">
            <div className="relative min-h-[390px] overflow-hidden bg-(--siraj-black) md:min-h-[520px]">
              <img
                key={activeService.id}
                src={activeService.image}
                alt={activeService.title}
                className="absolute inset-0 h-full w-full scale-105 object-cover transition duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/86 via-black/30 to-black/5" />

              <div className="absolute left-5 right-5 top-5 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                  <Star
                    size={13}
                    className="fill-(--clay-gold-light) text-(--clay-gold-light)"
                  />
                  {activeService.rating}
                  <span className="text-white/60">{activeService.tag}</span>
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black tracking-widest text-(--clay-navy)">
                  {activeService.code}
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-(--clay-gold-light)" />
                  New Al Siraj Service
                </div>
                <h3 className="max-w-xl text-4xl font-black leading-tight text-white md:text-6xl">
                  {activeService.title}
                </h3>
              </div>
            </div>

            <div className="relative p-5 md:p-8 lg:p-9">
              <div className="mb-8 flex items-start justify-between gap-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-(--clay-gold-dark)">
                    Boarding Pass
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-500">
                    Service {active + 1} of {count}
                  </p>
                </div>
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-(--clay-bg) text-(--clay-navy)">
                  {activeService.icon}
                </div>
              </div>

              <div className="mb-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    From
                  </p>
                  <p className="mt-1 text-xl font-black text-(--clay-navy)">
                    Request
                  </p>
                </div>
                <div className="flex items-center gap-2 text-(--clay-gold-dark)">
                  <span className="h-2 w-2 rounded-full bg-current" />
                  <span className="h-px w-14 bg-current sm:w-20" />
                  <Plane size={17} />
                  <span className="h-px w-14 bg-current sm:w-20" />
                  <span className="h-2 w-2 rounded-full bg-current" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    To
                  </p>
                  <p className="mt-1 text-xl font-black text-(--clay-navy)">
                    Confirmed
                  </p>
                </div>
              </div>

              <p className="mb-8 text-base leading-relaxed text-slate-600 md:text-lg">
                {activeService.description}
              </p>

              <div className="mb-8 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Class
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    Premium
                  </p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    Ready
                  </p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Type
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {activeService.tag}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous service"
                  className="clay-btn grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-(--clay-navy) shadow-sm"
                >
                  <ChevronLeft size={19} />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next service"
                  className="clay-btn grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-(--clay-navy) shadow-sm"
                >
                  <ChevronRight size={19} />
                </button>
                <span className="h-px flex-1 bg-slate-200" />
                <span className="btn-gold inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black text-(--clay-navy-dark)">
                  Explore
                  <ArrowUpRight size={16} />
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {services.map((service, i) => (
            <button
              key={service.id}
              type="button"
              onClick={() => goTo(i)}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                i === active
                  ? "border-(--clay-gold) bg-(--siraj-black) text-white shadow-xl shadow-slate-900/15"
                  : "border-slate-200 bg-white text-slate-900 hover:-translate-y-1 hover:border-(--clay-gold)"
              }`}
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <span
                  className={`grid h-10 w-10 place-items-center rounded-xl ${
                    i === active
                      ? "bg-(--clay-gold-light) text-(--clay-navy-dark)"
                      : "bg-(--clay-bg) text-(--clay-navy)"
                  }`}
                >
                  {service.icon}
                </span>
                <span
                  className={`text-[11px] font-black tracking-widest ${
                    i === active ? "text-white/55" : "text-slate-400"
                  }`}
                >
                  {service.code}
                </span>
              </div>
              <p className="text-sm font-black leading-snug">{service.title}</p>
              <p
                className={`mt-1 text-xs font-semibold ${
                  i === active ? "text-white/55" : "text-slate-500"
                }`}
              >
                {service.tag}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-7 flex justify-center gap-2">
          {services.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to service ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === active
                  ? "w-8 bg-(--clay-gold-dark)"
                  : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      </div>

      <BottomWave />
    </section>
  );
}
