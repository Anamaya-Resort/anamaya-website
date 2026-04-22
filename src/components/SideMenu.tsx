"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SIDE_MENU, BOOK_CTA, type NavItem } from "@/data/nav";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SideMenu({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className={`absolute top-0 right-0 h-full w-full max-w-sm overflow-y-auto bg-zinc-900/95 text-zinc-100 shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <span className="text-lg font-semibold tracking-wide">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="6" y1="6"  x2="18" y2="18" />
              <line x1="18" y1="6" x2="6"  y2="18" />
            </svg>
          </button>
        </div>

        <nav className="px-6 py-6">
          <ul className="space-y-1">
            {SIDE_MENU.map((item) => (
              <MenuItem key={item.label} item={item} onNavigate={onClose} />
            ))}
          </ul>

          <Link
            href={BOOK_CTA.href}
            onClick={onClose}
            className="mt-8 block rounded-full bg-amber-600 px-5 py-3 text-center text-sm font-semibold tracking-wide text-white transition-colors hover:bg-amber-700"
          >
            {BOOK_CTA.label}
          </Link>
        </nav>
      </aside>
    </div>
  );
}

function MenuItem({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const [expanded, setExpanded] = useState(false);

  if (!item.children?.length) {
    return (
      <li>
        <Link
          href={item.href ?? "#"}
          onClick={onNavigate}
          className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10"
        >
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10"
      >
        <span>{item.label}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <ul className="mt-1 space-y-1 border-l border-white/10 pl-4">
          {item.children.map((child) => (
            <li key={child.label}>
              <Link
                href={child.href ?? "#"}
                onClick={onNavigate}
                className="block rounded-md px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
