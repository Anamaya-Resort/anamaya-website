"use client";

import Link from "next/link";
import { useState } from "react";
import { BOOK_CTA } from "@/data/nav";
import SideMenu from "./SideMenu";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2" aria-label="Anamaya home">
            <span className="text-2xl font-semibold tracking-tight text-anamaya-charcoal">
              Anamaya
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href={BOOK_CTA.href}
              className="hidden rounded-full bg-anamaya-green px-5 py-2 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-anamaya-green-dark sm:inline-block"
            >
              {BOOK_CTA.label}
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-anamaya-charcoal transition-colors hover:bg-zinc-50"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
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
