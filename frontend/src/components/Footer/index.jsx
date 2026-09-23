import logo from "../../assets/images/logosirajjj.png";
import { travelImages } from "../../data/travelImages";
import { CiLogin } from "react-icons/ci";
import {
  FaWhatsapp,
  FaPhoneAlt,
  FaArrowRight,
  FaFacebookF,
  FaInstagram,
} from "react-icons/fa";
import { IoMail, IoLocationSharp } from "react-icons/io5";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/+923006666344";
const toWhatsappUrl = (phone) => `https://wa.me/${phone}`;

const quickLinks = [
  { label: "Home", guestHref: "/auth/login", userHref: "/dashboard" },
  { label: "Group Tickets", guestHref: "/auth/login", userHref: "/dashboard/groups" },
  { label: "Umrah Packages", guestHref: "/auth/login", userHref: "/dashboard/all-groups" },
];
const topPackages = [
  { label: "Umrah Groups", guestHref: "/auth/login", userHref: "/dashboard/groups?type_filter=umrah" },
  { label: "UAE Groups", guestHref: "/auth/login", userHref: "/dashboard/groups?type_filter=uae" },
  { label: "KSA Groups", guestHref: "/auth/login", userHref: "/dashboard/groups?type_filter=ksa" },
  { label: "Oman Group", guestHref: "/auth/login", userHref: "/dashboard/groups?type_filter=oman" },
];

export default function Footer({ user }) {
  const isLoggedIn = !!user?._id || !!localStorage.getItem("frontend_token");
  const getFooterHref = (item) => (isLoggedIn ? item.userHref : item.guestHref);

  return (
    <>
      {/* --- TOP CTA: ACTION ZONE --- */}
      {/* {!user?._id && (
        <div className="relative overflow-hidden bg-linear-to-br from-(--siraj-black) via-(--clay-navy-dark) to-(--clay-navy)">
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-(--clay-gold) opacity-15 blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto py-16 px-6 flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
            <div className="text-center lg:text-left text-white max-w-xl space-y-4">
              <div className="clay-glass-light inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest">
                <Globe size={12} className="text-(--clay-gold-light)" />
                Start Your Journey
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none">
                Group Travel And Umrah <br />
                Made Clear.
              </h2>
              <p className="text-white/70 text-sm font-medium max-w-md leading-relaxed">
                Create an account to view group seats, request support, and
                manage travel bookings with New Al Siraj.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto shrink-0">
              <Link
                to="/auth/register"
                className="btn-gold px-8 py-4 text-(--clay-navy-dark) rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2"
              >
                <span>Signup Now</span>
                <FaArrowRight size={12} />
              </Link>
              <Link
                to="/auth/login"
                className="btn-outline-white px-8 py-4 text-white rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2"
              >
                <span>Login</span>
                <CiLogin size={16} />
              </Link>
            </div>
          </div>
        </div>
      )} */}

      {/* --- MAIN FOOTER --- */}
      <footer id="contact" className="relative bg-(--siraj-black) text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none mix-blend-luminosity bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${travelImages.newsletter})` }}
        />

        <div className="max-w-7xl mx-auto px-6 pt-20 pb-10 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Column 1: Brand Info & Socials */}
            <div className="space-y-6">
              <div className="siraj-logo-frame inline-block rounded-2xl p-2.5">
                <img
                  src={logo}
                  alt="New Al Siraj Travels logo"
                  className="w-32"
                />
              </div>
              <p className="text-white/50 leading-relaxed text-xs font-medium">
                <span className="text-white font-semibold">
                  New Al Siraj Travels
                </span>{" "}
                supports group tickets, Umrah packages, visas, hotels, and
                travel services with clear communication from start to finish.
              </p>
              <div className="flex gap-3 pt-2">
                <a
                  href="#"
                  className="clay-glass-light w-9 h-9 rounded-full! flex items-center justify-center hover:text-(--clay-gold-light) transition-colors"
                  aria-label="Facebook"
                >
                  <FaFacebookF size={12} />
                </a>
                <a
                  href="#"
                  className="clay-glass-light w-9 h-9 rounded-full! flex items-center justify-center hover:text-(--clay-gold-light) transition-colors"
                  aria-label="Instagram"
                >
                  <FaInstagram size={12} />
                </a>
                <a
                  href={WHATSAPP_URL}
                  className="clay-glass-light w-9 h-9 rounded-full! flex items-center justify-center hover:text-(--clay-gold-light) transition-colors"
                  aria-label="WhatsApp"
                >
                  <FaWhatsapp size={12} />
                </a>
              </div>
            </div>

            {/* Column 2: Navigation */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-(--clay-gold-light)">
                Quick Links
              </h3>
              <ul className="space-y-3.5">
                {quickLinks.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={getFooterHref(item)}
                      className="text-white/60 hover:text-white transition-colors text-xs font-medium flex items-center gap-2 group"
                    >
                      <ChevronTinyRight />
                      <span className="group-hover:translate-x-0.5 transition-transform">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Services */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-(--clay-gold-light)">
                Top Packages
              </h3>
              <ul className="space-y-3.5 text-xs font-medium text-white/60">
                {topPackages.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={getFooterHref(item)}
                      className="hover:text-white cursor-pointer transition-colors flex items-center gap-2"
                    >
                      <span className="w-1 h-1 bg-(--clay-gold-light) rounded-full" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Contact */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-(--clay-gold-light)">
                Get In Touch
              </h3>
              <div className="space-y-4">
                <a
                  href="https://wa.me/+923066001334"
                  className="group flex items-center gap-3 text-white/60 hover:text-white transition-colors"
                >
                  <div className="clay-glass-light w-8 h-8 rounded-lg! flex items-center justify-center shrink-0">
                    <FaWhatsapp size={13} />
                  </div>
                  <span className="text-xs font-medium">0306-6001334</span>
                </a>

                <a
                  href="tel:0552202782"
                  className="group flex items-center gap-3 text-white/60 hover:text-white transition-colors"
                >
                  <div className="clay-glass-light w-8 h-8 rounded-lg! flex items-center justify-center shrink-0">
                    <FaPhoneAlt size={12} />
                  </div>
                  <span className="text-xs font-medium">0552202782</span>
                </a>
                {/* <a
                  href="tel:+923066001334"
                  className="group flex items-center gap-3 text-white/60 hover:text-white transition-colors"
                >
                  <div className="clay-glass-light w-8 h-8 rounded-lg! flex items-center justify-center shrink-0">
                    <FaPhoneAlt size={12} />
                  </div>
                  <span className="text-xs font-medium">0306-6001334</span>
                </a> */}
                <a
                  href={toWhatsappUrl("923000802965")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 text-white/60 hover:text-white transition-colors"
                >
                  <div className="clay-glass-light w-8 h-8 rounded-lg! flex items-center justify-center shrink-0">
                    <FaWhatsapp size={13} />
                  </div>
                  <span className="text-xs font-medium">0300-0802965</span>
                </a>
                <a
                  href={toWhatsappUrl("923000802963")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 text-white/60 hover:text-white transition-colors"
                >
                  <div className="clay-glass-light w-8 h-8 rounded-lg! flex items-center justify-center shrink-0">
                    <FaWhatsapp size={13} />
                  </div>
                  <span className="text-xs font-medium">0300-0802963</span>
                </a>

                <a
                  href="mailto:alsirajtravelspk13@gmail.com"
                  className="group flex items-center gap-3 text-white/60 hover:text-white transition-colors min-w-0"
                >
                  <div className="clay-glass-light w-8 h-8 rounded-lg! flex items-center justify-center shrink-0">
                    <IoMail size={13} />
                  </div>
                  <span className="text-xs font-medium truncate">
                    alsirajtravelspk13@gmail.com
                  </span>
                </a>

                {/* Branch Address */}
                <div className="flex items-start gap-3 text-white/60">
                  <div className="clay-glass-light w-8 h-8 rounded-lg! flex items-center justify-center shrink-0 mt-0.5">
                    <IoLocationSharp size={14} />
                  </div>
                  <span className="text-xs font-medium leading-relaxed">
                    Plaza 44 First Floor Main Boulevard Garden Town Phase 3, Gujranwala
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* --- BOTTOM BAR --- */}
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/40">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
              <span>&copy; {dayjs().year()} New Al Siraj Travels</span>
              <span className="hidden sm:block w-1 h-1 bg-white/20 rounded-full" />
              <a href="#" className="hover:text-(--clay-gold-light) transition-colors">
                Privacy Policy
              </a>
            </div>

            <p className="tracking-wide font-medium text-white/40 normal-case">
              Developed by{" "}
              <a
                href="https://nexagensolution.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-(--clay-gold-light) hover:underline"
              >
                Nexagen Solution
              </a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

function ChevronTinyRight() {
  return (
    <svg
      width="5"
      height="8"
      viewBox="0 0 6 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 9L5 5L1 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
