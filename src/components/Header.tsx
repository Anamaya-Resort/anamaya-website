"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CALENDAR_CTA, LOGO } from "@/data/nav";
import { useHeader } from "@/contexts/HeaderContext";
import SideMenu from "./SideMenu";

const SCROLL_THRESHOLD_VH = 0.4; // % of viewport height before header flips to solid

export default function Header() {
  const { overVideo } = useHeader();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const threshold = window.innerHeight * SCROLL_THRESHOLD_VH;
      setScrolled(window.scrollY > threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // "Light mode" = transparent over dark hero video (white text, white logo)
  // "Dark mode"  = solid white (dark text, dark logo)
  const lightMode = overVideo && !scrolled;

  return (
    <>
      <header
        className={[
          "fixed top-0 left-0 right-0 z-40 w-full transition-all duration-300",
          lightMode
            ? "bg-transparent"
            : "bg-white/95 shadow-sm backdrop-blur-sm",
        ].join(" ")}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Anamaya home" className="flex items-center">
            <img
              src={lightMode ? LOGO.light : LOGO.dark}
              alt="Anamaya Resort"
              width={LOGO.width}
              height={LOGO.height}
              className="h-10 w-auto transition-opacity duration-300 sm:h-12"
            />
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href={CALENDAR_CTA.href}
              className={[
                "rounded-full px-5 py-2 text-sm font-semibold tracking-wider transition-colors",
                lightMode
                  ? "bg-white/15 text-white ring-1 ring-white/40 backdrop-blur-sm hover:bg-white hover:text-anamaya-charcoal"
                  : "bg-anamaya-green text-white hover:bg-anamaya-green-dark",
              ].join(" ")}
            >
              {CALENDAR_CTA.label}
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className={[
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold tracking-wider transition-colors",
                lightMode
                  ? "bg-white/15 text-white ring-1 ring-white/40 backdrop-blur-sm hover:bg-white hover:text-anamaya-charcoal"
                  : "bg-anamaya-charcoal text-white hover:bg-black",
              ].join(" ")}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                <line x1="4" y1="7"  x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
              MENU
            </button>
          </nav>
        </div>
      </header>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
