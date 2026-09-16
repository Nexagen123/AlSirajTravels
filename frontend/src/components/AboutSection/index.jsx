import { ChevronRight, MapPin, CheckCircle2 } from "lucide-react";
import { travelImages } from "../../data/travelImages";

const highlights = [
  "Clear group-ticket and Umrah booking support",
  "Guided visa and documentation handling",
  "Transparent fares with no hidden fees",
  "24/7 support before, during & after travel",
];

const stats = [
  { number: "10,000+", label: "Happy Travellers" },
  { number: "50+", label: "Destinations" },
  { number: "14+", label: "Years Experience" },
  { number: "98%", label: "Satisfaction Rate" },
];

const avatars = [
  { letter: "A", bg: "from-(--clay-navy-light) to-(--clay-navy-dark)" },
  { letter: "S", bg: "from-(--clay-gold-light) to-(--clay-gold-dark)" },
  { letter: "M", bg: "from-slate-400 to-slate-600" },
];

export default function AboutSection() {
  return (
    <section className="relative py-24 md:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 md:px-10 relative">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* ── LEFT: Image composition ── */}
          <div className="relative order-2 lg:order-1">
            {/* Main image */}
            <div className="clay-white p-3">
              <div className="clay-well relative h-96 md:h-137.5 overflow-hidden">
                <img
                  style={{ height: "100%" }}
                  src={travelImages.travelers}
                  alt="New Al Siraj travellers"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-(--clay-navy-dark)/40 via-transparent to-transparent" />
              </div>
            </div>

            {/* Small floating image */}
            <div className="clay-white absolute -bottom-8 -right-6 md:-bottom-10 md:-right-10 w-36 h-48 md:w-48 md:h-60 p-2">
              <img
                style={{ height: "100%" }}
                src={travelImages.madinah}
                alt="Umrah group travel"
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>

            {/* Experience badge */}
            <div className="clay-white absolute top-6 -left-4 md:top-10 md:-left-8 p-4 md:p-5">
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl font-black text-(--clay-navy)">
                  14
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Years
                </span>
                <div className="w-10 h-1 rounded-full mt-2 bg-(--clay-gold)" />
                <span className="text-[8px] text-gray-400 uppercase tracking-widest mt-1">
                  Of Excellence
                </span>
              </div>
            </div>

            {/* Rating badge */}
            <div className="clay-white absolute bottom-24 -left-4 md:bottom-32 md:-left-6 p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex -space-x-2">
                  {avatars.map((a) => (
                    <div
                      key={a.letter}
                      className={`w-8 h-8 md:w-9 md:h-9 rounded-full bg-linear-to-br ${a.bg} flex items-center justify-center text-white text-xs font-bold border-2 border-white`}
                    >
                      {a.letter}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-black text-(--clay-navy) flex items-center gap-1">
                    4.9 Rating
                  </p>
                  <p className="text-xs text-gray-500">1,200+ Reviews</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Content ── */}
          <div className="order-1 lg:order-2">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-10 bg-(--clay-gold-dark)" />
              <span className="text-(--clay-gold-dark) text-xs font-bold tracking-[0.3em] uppercase">
                About Us
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-(--clay-navy) leading-[1.1] mb-4">
              Built on Trust,
              <span className="block text-(--clay-gold-dark)">
                Powered by Service
              </span>
            </h2>

            {/* Description */}
            <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-8 max-w-xl">
              New Al Siraj Travels helps pilgrims, families, and agencies move
              from enquiry to confirmed booking with practical support, clear
              communication, and carefully managed travel options.
            </p>

            {/* Highlights list */}
            <div className="space-y-2.5 mb-8">
              {highlights.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-(--clay-gold-dark) shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm md:text-base font-medium">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="clay-white grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 p-4 md:p-5">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-xl md:text-2xl font-black text-(--clay-navy)">
                    {stat.number}
                  </div>
                  <div className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <button className="btn-gold group inline-flex items-center gap-2 text-(--clay-navy-dark) px-8 md:px-10 py-3.5 md:py-4 rounded-full font-bold text-sm md:text-base">
                Find Tours
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button className="clay-btn flex items-center gap-2 px-6 md:px-8 py-3.5 md:py-4 rounded-full border-2 border-(--clay-navy)/15 text-(--clay-navy) font-bold text-sm md:text-base hover:border-(--clay-gold-dark) hover:text-(--clay-gold-dark) transition-colors duration-300">
                <MapPin className="w-4 h-4" />
                Find Your Best Destination
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
