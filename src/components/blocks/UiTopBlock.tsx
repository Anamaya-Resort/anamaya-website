"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { UiTopContent } from "@/types/blocks";
import { useHeaderOptional } from "@/contexts/HeaderContext";
import { useChromeOptional } from "@/contexts/ChromeContext";
import HeaderAuth from "../HeaderAuth";

const SCROLL_THRESHOLD_VH = 0.4;

/**
 * Top-bar overlay. Ports Header.tsx onto the block-content schema so the
 * top bar can be configured per template. Behaviour matches the legacy
 * hard-coded Header.tsx exactly when the default content is used.
 *
 * Reads cross-cutting state from contexts (not content): `overVideo`
 * from HeaderContext (set by hero blocks) and `user` + `setMenuOpen`
 * from ChromeContext. When either context is missing the block falls
 * back to a static rendering so the block-editor LivePreview still
 * shows something representative.
 */
export default function UiTopBlock({ content }: { content: UiTopContent }) {
  const c = content ?? {};
  const z = c.overlay_z ?? 40;
  const lightmodeWhenOverVideo = c.lightmode_when_over_video !== false;
  const logoDark = c.logo_dark_url || "/anamaya-logo.webp";
  const logoLight = c.logo_light_url || "/anamaya-logo-white.webp";
  const logoW = c.logo_width ?? 300;
  const logoH = c.logo_height ?? 136;
  const ctaLabel = c.cta_label ?? "CALENDAR";
  const ctaHref = c.cta_href ?? "/rg-calendar/";
  const menuLabel = c.menu_label ?? "MENU";

  const header = useHeaderOptional();
  const chrome = useChromeOptional();
  const overVideo = header?.overVideo ?? false;
  const user = chrome?.user ?? null;
  const openMenu = () => chrome?.setMenuOpen(true);

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

  const lightMode = lightmodeWhenOverVideo && overVideo && !scrolled;

  return (
    <header
      className={[
        "fixed top-0 left-0 right-0 w-full transition-all duration-300",
        lightMode
          ? "bg-anamaya-charcoal/50 backdrop-blur-sm"
          : "bg-white/95 shadow-sm backdrop-blur-sm",
      ].join(" ")}
      style={{ zIndex: z }}
    >
      {/* Full-bleed bar: logo flush with the left viewport edge, nav
          flush with the right edge, both inset 24px (px-6). The
          previous mx-auto + max-w-7xl wrapper centred everything in
          a 1280px container, leaving the logo and nav floating
          inside that band rather than at the actual edges. */}
      <div className="flex h-20 w-full items-center justify-between px-6">
        <Link href="/" aria-label="Anamaya home" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightMode ? logoLight : logoDark}
            alt="Anamaya Resort"
            width={logoW}
            height={logoH}
            className="h-10 w-auto transition-opacity duration-300 sm:h-12"
          />
        </Link>

        <nav className="flex items-center gap-3 sm:gap-4">
          <Link
            href={ctaHref}
            className={[
              "rounded-full px-5 py-2 text-sm font-semibold tracking-wider transition-colors",
              lightMode
                ? "bg-white/15 text-white ring-1 ring-white/40 backdrop-blur-sm hover:bg-white hover:text-anamaya-charcoal"
                : "bg-anamaya-green text-white hover:bg-anamaya-green-dark",
            ].join(" ")}
          >
            {ctaLabel}
          </Link>

          <button
            type="button"
            onClick={openMenu}
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
            {menuLabel}
          </button>

          <HeaderAuth user={user} lightMode={lightMode} />
        </nav>
      </div>
    </header>
  );
}
