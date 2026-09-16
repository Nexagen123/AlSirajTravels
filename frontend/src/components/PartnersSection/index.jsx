import { useEffect, useRef } from "react";
import saudia from "../../assets/images/partners/saudia.svg";
import emirates from "../../assets/images/partners/emirates.png";
import omanAir from "../../assets/images/partners/oman-air.png";
import airSial from "../../assets/images/partners/airsial.png";
import flyJinnah from "../../assets/images/partners/fly-jinnah.png";
import thaiAirways from "../../assets/images/partners/thai-airways.png";
import qatarAirways from "../../assets/images/partners/qatar-airways.png";
import etihadAirways from "../../assets/images/partners/etihad-airways.png";
import gulfAir from "../../assets/images/partners/gulf-air.png";

const partners = [
  { name: "Saudia", logo: saudia },
  { name: "Emirates", logo: emirates },
  { name: "Oman Air", logo: omanAir },
  { name: "AirSial", logo: airSial },
  { name: "Fly Jinnah", logo: flyJinnah },
  { name: "Thai Airways", logo: thaiAirways },
  { name: "Qatar Airways", logo: qatarAirways },
  { name: "Etihad Airways", logo: etihadAirways },
  { name: "Gulf Air", logo: gulfAir },
];

const SPEED = 0.7; // px per frame — increase for faster scroll

export default function PartnersSection() {
  const trackRef = useRef(null);
  const isPausedRef = useRef(false);
  const rafRef = useRef(null);

  const scrollByAmount = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" });
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let lastTime = performance.now();

    const tick = (now) => {
      const delta = now - lastTime;
      lastTime = now;

      if (!isPausedRef.current) {
        // half of scrollWidth because we duplicated the list
        const half = track.scrollWidth / 2;
        track.scrollLeft += SPEED * (delta / 16.67); // normalize to 60fps

        // when we've scrolled past the first copy, jump back seamlessly
        if (track.scrollLeft >= half) {
          track.scrollLeft -= half;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // duplicate for seamless loop
  const loopedPartners = [...partners, ...partners];

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-10xl px-5 md:px-10">
        <div className="mb-12 text-center">
          <p className="text-[12px] font-black uppercase tracking-[0.45em] text-(--siraj-blue-dark)">
            Our Partners
          </p>
          <span className="mx-auto mt-2 block h-px w-10 bg-blue-600" />
        </div>

        <div className="flex items-center gap-5 md:gap-8">
          <button
            type="button"
            aria-label="Previous partners"
            onClick={() => scrollByAmount(-1)}
            className="hidden h-10 w-10 shrink-0 items-center justify-center text-7xl! font-light text-blue-800 transition hover:text-blue-600 md:flex"
          >
            ‹
          </button>

          <div
            ref={trackRef}
            onMouseEnter={() => (isPausedRef.current = true)}
            onMouseLeave={() => (isPausedRef.current = false)}
            onTouchStart={() => (isPausedRef.current = true)}
            onTouchEnd={() => (isPausedRef.current = false)}
            className="scrollbar-none flex min-w-0 flex-1 items-center gap-10 overflow-x-auto md:gap-14"
          >
            {loopedPartners.map((partner, i) => (
              <div
                key={`${partner.name}-${i}`}
                className="flex h-17 w-38.5 shrink-0 items-center justify-center"
              >
                <img
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  loading="lazy"
                  className="max-h-16 w-auto max-w-36.5 object-contain"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            aria-label="Next partners"
            onClick={() => scrollByAmount(1)}
            className="hidden h-10 w-10 shrink-0 items-center justify-center text-7xl! font-light text-blue-800 transition hover:text-blue-600 md:flex"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}