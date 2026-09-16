import { Fragment } from "react";
import { Plane, Shield, Moon, Bed, Headphones, Compass } from "lucide-react";

// High-quality travel image for the fixed parallax panel
import { travelImages } from "../../data/travelImages";

const features = [
  {
    title: "Connected Routes",
    desc: "Access to active group seats and high-demand international routes with practical support.",
    icon: <Plane size={22} />,
  },
  {
    title: "Visa Guidance",
    desc: "Document handling and review so travellers know what is needed before submission.",
    icon: <Shield size={22} />,
  },
  {
    title: "Sacred Journeys",
    desc: "Umrah packages shaped around comfort, timing, and access to Makkah and Madinah.",
    icon: <Moon size={22} />,
  },
  {
    title: "Trusted Stays",
    desc: "Hotel choices for families and groups with location, budget, and reliability in view.",
    icon: <Bed size={22} />,
  },
];

const trustItems = [
  { label: "Protection", title: "IATA Licensed", icon: <Shield size={18} /> },
  { label: "Human-First", title: "24/7 Global Support", icon: <Headphones size={18} /> },
  { label: "Expertise", title: "Seamless Planning", icon: <Compass size={18} /> },
];

export default function ChooseUsSection() {
  return (
    <section className="w-full flex flex-col lg:flex-row min-h-screen overflow-hidden">
      {/* --- LEFT SIDE: Sticky Parallax Background Panel --- */}
      <div className="w-full lg:w-2/5 relative min-h-100 lg:min-h-screen overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ backgroundImage: `url(${travelImages.madinah})` }}
        />
        <div className="absolute inset-0 bg-linear-to-br from-(--clay-navy-dark)/85 via-(--clay-navy)/70 to-(--clay-navy-dark)/90" />

        <div className="absolute inset-0 p-8 md:p-16 flex flex-col justify-between z-10 text-white">
          <div>
            <div className="clay-glass-light inline-flex items-center gap-2 px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-(--clay-gold-light) animate-pulse" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-(--clay-gold-light)">
                The Advantage
              </p>
            </div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
              Why Travellers <br />
              Trust Our <br />
              <span className="text-(--clay-gold-light)">Expertise</span>
            </h2>
          </div>

          <div className="clay-glass-light max-w-sm p-5 rounded-2xl!">
            <p className="text-white/85 text-sm leading-relaxed font-medium italic">
              "We don't just book trips; we curate life-changing moments.
              Trust the experts who put your journey first."
            </p>
          </div>
        </div>
      </div>

      {/* --- RIGHT SIDE: Core Content & Features --- */}
      <div className="w-full lg:w-3/5 p-8 md:p-16 flex flex-col justify-between bg-(--clay-bg)">
        <div>
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-3">
              <span className="h-px w-8 bg-(--clay-gold-dark)" />
              <span className="text-(--clay-gold-dark) text-xs font-bold tracking-[0.3em] uppercase">
                New Al Siraj Advantage
              </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-(--clay-navy) tracking-tight">
              Clear Travel Solutions For Agents And Families
            </h3>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {features.map((item) => (
              <div key={item.title} className="clay-white p-6">
                <div className="w-12 h-12 rounded-xl clay-gold flex items-center justify-center text-(--clay-navy-dark) mb-5">
                  {item.icon}
                </div>
                <h4 className="text-lg font-black mb-2 tracking-tight text-(--clay-navy)">
                  {item.title}
                </h4>
                <p className="text-gray-500 text-xs leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust bar */}
        <div className="clay-navy p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-white">
          {trustItems.map((t, i) => (
            <Fragment key={t.title}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg clay-gold flex items-center justify-center text-(--clay-navy-dark) shrink-0">
                  {t.icon}
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/50">
                    {t.label}
                  </p>
                  <p className="text-sm font-black">{t.title}</p>
                </div>
              </div>
              {i < trustItems.length - 1 && (
                <div className="hidden md:block w-px h-8 bg-white/10" />
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
