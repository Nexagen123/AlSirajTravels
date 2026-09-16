import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/images/logosiraj.png";
import { travelImages } from "../../data/travelImages";
import uaeImg from "../../assets/images/uae.webp";
import jeddahImg from "../../assets/images/jeddah.webp";
import madinaImg from "../../assets/images/madina.webp";
import mascatImg from "../../assets/images/mascat.webp";
import qatarImg from "../../assets/images/qatar.jpg";
import ukImg from "../../assets/images/uk.webp";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Group Tickets", href: "/all-groups" },
  { label: "Umrah Packages", href: "/all-groups?group_type=UMRAH GROUP" },
  { label: "Visa", href: "/auth/register" },
  { label: "Contact", href: "#contact" },
];

const heroGroups = [
  { label: "UAE One Way", image: uaeImg, href: "/all-groups?type_filter=uae" },
  { label: "KSA One Way", image: jeddahImg, href: "/all-groups?type_filter=ksa" },
  { label: "Umrah Groups", image: madinaImg, href: "/all-groups?type_filter=umrah" },
  { label: "Oman One Way", image: mascatImg, href: "/all-groups?type_filter=oman" },
  { label: "Qatar Groups", image: qatarImg, href: "/all-groups?type_filter=qatar" },
  { label: "UK Groups", image: ukImg, href: "/all-groups?type_filter=uk" },
];

const serviceIcons = {
  flight: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 12.75L3 21l9-3.75L21 21l-3-8.25M6 12.75L3 3l9 3.75L21 3l-3 9.75M6 12.75h12"
    />
  ),
  users: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11a3 3 0 100-6 3 3 0 000 6zM19 18c0-1.6-1.1-2.9-2.6-3.3M16 8.4a2.4 2.4 0 110-4.8M5 18c0-1.6 1.1-2.9 2.6-3.3M8 8.4a2.4 2.4 0 100-4.8" />
    </>
  ),
  moon: <path strokeLinecap="round" strokeLinejoin="round" d="M20.2 14.6A8.5 8.5 0 119.4 3.8 6.7 6.7 0 0020.2 14.6z" />,
  shield: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.7-3 8.7-7 10-4-1.3-7-5.3-7-10V6l7-3zM9.5 12l1.7 1.7 3.6-4" />,
  pin: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.1-7.5 11.2-7.5 11.2S4.5 17.6 4.5 10.5a7.5 7.5 0 1115 0z" />
    </>
  ),
};

function Icon({ name, className = "w-5 h-5" }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.9}
    >
      {serviceIcons[name]}
    </svg>
  );
}

export default function HeroSection() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("frontend_token"));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ctaPath = isLoggedIn ? "/dashboard/groups" : "/auth/register";

  return (
    <>
      {!isLoggedIn && (
        <header className="fixed left-0 right-0 top-0 z-50 px-3 sm:px-5 pt-3">
          <div
            className={`max-w-7xl mx-auto transition-all duration-300 border ${
              scrolled
                ? "bg-white/95 border-slate-200 shadow-xl shadow-slate-900/10"
                : "bg-black/35 border-white/15 backdrop-blur-md"
            } rounded-2xl overflow-hidden`}
          >
            <div className="px-3 sm:px-5 md:px-7 flex items-center justify-between h-20">
              <Link to="/" className="siraj-logo-frame shrink-0 rounded-xl px-2.5 py-1.5">
                <img
                  style={{ height: "54px" }}
                  src={logo}
                  alt="New Al Siraj Travels"
                  className="w-auto object-contain"
                />
              </Link>

              <nav className="hidden lg:flex items-center gap-7">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    className={`text-sm font-bold transition-colors ${
                      scrolled
                        ? "text-(--siraj-ink) hover:text-(--siraj-blue)"
                        : "text-white/90 hover:text-(--siraj-gold-light)"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="hidden md:flex items-center gap-3">
                <Link
                  to="/auth/login"
                  className={`px-5 py-2.5 rounded-full text-sm font-bold ${
                    scrolled
                      ? "text-(--siraj-blue-dark) bg-slate-100"
                      : "text-white bg-white/15"
                  }`}
                >
                  Login
                </Link>
                <Link
                  to="/auth/register"
                  className="btn-gold px-5 py-2.5 rounded-full text-sm font-black text-(--siraj-black)"
                >
                  Become a Partner
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setNavOpen((value) => !value)}
                className={`lg:hidden p-2 ${scrolled ? "text-(--siraj-ink)" : "text-white"}`}
                aria-label="Toggle menu"
              >
                <span className="block w-6 h-0.5 bg-current mb-1.5" />
                <span className="block w-6 h-0.5 bg-current mb-1.5" />
                <span className="block w-6 h-0.5 bg-current" />
              </button>
            </div>

            {navOpen && (
              <div className="lg:hidden px-5 pb-5 flex flex-col gap-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setNavOpen(false)}
                    className={`py-2 border-b text-sm font-bold ${
                      scrolled
                        ? "text-(--siraj-ink) border-slate-100"
                        : "text-white border-white/10"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link to="/auth/login" className="text-center rounded-full bg-white/15 py-2.5 text-sm font-bold text-white">
                    Login
                  </Link>
                  <Link to="/auth/register" className="btn-gold text-center rounded-full py-2.5 text-sm font-black text-(--siraj-black)">
                    Register
                  </Link>
                </div>
              </div>
            )}
          </div>
        </header>
      )}

      <section className="relative overflow-hidden bg-(--siraj-black) pt-28 md:pt-32 pb-12 md:pb-16">
        <img
          src={travelImages.hero}
          alt="Pilgrims and travellers at a holy destination"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="siraj-photo-overlay absolute inset-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-10 pb-16">
          <div className="grid lg:grid-cols-[0.92fr_1.08fr] gap-8 lg:gap-10 items-center min-h-[560px]">
            <div className="text-white">
              <div className="inline-flex items-center gap-3 rounded-full bg-white/12 border border-white/15 px-4 py-2 mb-6 backdrop-blur">
                <span className="w-2 h-2 rounded-full bg-(--siraj-gold-light)" />
                <span className="text-[11px] font-black uppercase tracking-[0.22em]">
                  New Al Siraj Travels
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.04] max-w-xl">
                Travel Made Easy.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/82 font-medium">
                Group tickets, Umrah packages, visas, hotels, and travel support
                arranged with a clear booking flow and a real team behind every trip.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={ctaPath} className="btn-gold rounded-full px-7 py-3.5 text-sm font-black text-(--siraj-black)">
                  Start Booking
                </Link>
                <Link
                  to="/all-groups"
                  className="rounded-full border border-white/60 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur hover:bg-white/20"
                >
                  View Group Tickets
                </Link>
              </div>
            </div>

            {/* <div className="siraj-card overflow-hidden p-3 lg:ml-auto lg:max-w-[560px]">
              <div className="relative aspect-[6/4] overflow-hidden rounded-2xl bg-slate-100">
                <img
                  src={travelImages.airport}
                  alt="Airport departure lounge"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/78 via-black/20 to-transparent" /> */}
                {/* <div className="absolute left-5 right-5 bottom-5 text-white"> */}
                  {/* <p className="siraj-kicker text-(--siraj-gold-light)!">
                    Group Travel Desk
                  </p>
                  <h2 className="mt-2 text-2xl md:text-3xl font-black leading-tight">
                    
                  </h2> */}
                </div>
              </div>

              {/* <div className="grid grid-cols-3 gap-2.5 pt-3">
                {[
                  ["50k+", "Seats"],
                  ["24/7", "Support"],
                  ["PKR", "Fares"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                    <p className="text-lg font-black text-(--siraj-blue-dark)">
                      {value}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {label}
                    </p>
                  </div>
                ))}
              </div> */}
            {/* </div> */}
          {/* </div> */}
        {/* </div> */}
      </section>

      <section className="relative z-20 bg-white py-10 md:py-12">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="siraj-kicker">Popular Groups</p>
              <h2 className="mt-1 text-2xl md:text-3xl font-black text-(--siraj-blue-dark)">
                Choose Your Route
              </h2>
            </div>
            <Link
              to={isLoggedIn ? "/dashboard/groups" : "/auth/register"}
              className="hidden sm:inline-flex rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-(--siraj-blue-dark) hover:border-(--siraj-gold)"
            >
              See All
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {heroGroups.map((group) => (
              <Link
                key={group.label}
                to={isLoggedIn ? group.href.replace("/all-groups", "/dashboard/groups") : "/auth/register"}
                className="group overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-900/10 ring-1 ring-slate-200/70 transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                  <div
                    className="absolute inset-0 bg-center bg-cover opacity-20 blur-md scale-110"
                    style={{ backgroundImage: `url(${group.image})` }}
                  />
                  <img
                    src={group.image}
                    alt={group.label}
                    className="relative z-10 block h-full w-full object-contain object-center p-1.5 transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="flex items-center gap-2 p-3">
                  <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--siraj-gold)">
                    <Icon name="pin" className="h-4 w-4 text-(--siraj-black)" />
                  </div>
                  <p className="text-sm font-black leading-tight text-(--siraj-blue-dark)">
                    {group.label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
