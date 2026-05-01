"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import type { UiSideMenuRightContent, UiNavItem } from "@/types/blocks";
import { SIDE_MENU } from "@/data/nav";
import { getSSOLoginUrl } from "@/config/sso";
import { resolveBrandColor } from "@/config/brand-tokens";
import { useChromeOptional } from "@/contexts/ChromeContext";
import UserAvatar from "../UserAvatar";

const DEFAULT_BG_HEX = "#1a1a1a"; // matches the legacy bg-anamaya-charcoal

/** Convert a "#rrggbb" or "#rgb" hex to an `rgba(r,g,b,a)` string with the
 *  given 0–1 alpha. Falls back to the input string when it isn't a valid
 *  hex (so brand-token CSS-var refs already resolved by the caller pass
 *  through unchanged). */
function applyAlpha(color: string, alpha: number): string {
  let hex = color.trim();
  if (!hex.startsWith("#")) return color;
  hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (hex.length !== 6) return color;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return color;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Right-anchored slide-out menu overlay. Ports SideMenu.tsx onto the
 * block-content schema. Open/close is driven by ChromeContext.menuOpen
 * (the top bar's MENU button toggles it). When `overlay_trigger` is
 * "always" the drawer ignores the chrome state and stays open — useful
 * for previewing the open state in the block editor.
 *
 * Items come from content.items. For backward compatibility (and to
 * keep an existing site rendering even if the block has been wiped) we
 * fall back to the legacy SIDE_MENU constant when items is empty.
 */
export default function UiSideMenuRightBlock({ content }: { content: UiSideMenuRightContent }) {
  const c = content ?? {};
  const z = c.overlay_z ?? 50;
  const trigger = c.overlay_trigger ?? "on-menu";
  const widthMaxPx = c.width_max_px ?? 384;
  const ctaLabel = c.cta_label ?? "BOOK YOUR STAY";
  const ctaHref = c.cta_href ?? "/rg-calendar/";
  const items: UiNavItem[] = c.items?.length ? c.items : SIDE_MENU;

  // Background — brand token (or hex) + 0–100 opacity. Empty bg_color
  // falls back to the legacy charcoal so existing blocks keep their look.
  const bgRaw = resolveBrandColor(c.bg_color) ?? DEFAULT_BG_HEX;
  const bgOpacity = (c.bg_opacity ?? 90) / 100;
  const bgRgba = applyAlpha(bgRaw, bgOpacity);

  // Headline = top-level rows. Content = sub-items in expanded groups.
  const headlineFontClass = c.headline_font === "body" ? "font-sans" : "font-heading";
  const headlineStyle: CSSProperties = {
    fontSize: c.headline_size_px ?? 14,
    color: resolveBrandColor(c.headline_color) ?? "#f4f4f5", // zinc-100
    fontWeight: c.headline_bold ? 700 : 500,
    fontStyle: c.headline_italic ? "italic" : "normal",
  };
  const contentFontClass = c.content_font === "heading" ? "font-heading" : "font-sans";
  const contentStyle: CSSProperties = {
    fontSize: c.content_size_px ?? 14,
    color: resolveBrandColor(c.content_color) ?? "#d4d4d8", // zinc-300
    fontWeight: c.content_bold ? 700 : 400,
    fontStyle: c.content_italic ? "italic" : "normal",
  };

  const decorationTopUrl = c.decoration_top_url || null;
  const decorationTopHeight = c.decoration_top_height_px ?? 80;
  const decorationBottomUrl = c.decoration_bottom_url || null;
  const decorationBottomHeight = c.decoration_bottom_height_px ?? 80;

  const chrome = useChromeOptional();
  // When mounted outside a ChromeProvider (admin LivePreview, isolated
  // /block-preview iframes) treat the drawer as open so the editor can
  // see what they're editing — otherwise an "on-menu" drawer would sit
  // closed behind the checkerboard and look empty.
  const open = trigger === "always" ? true : chrome ? chrome.menuOpen : true;
  const close = () => chrome?.setMenuOpen(false);
  const user = chrome?.user ?? null;

  useEffect(() => {
    // Only lock body scroll + bind Escape on the real site. In admin
    // preview (no chrome) the drawer is "open" purely for visual
    // editing — we mustn't freeze the surrounding admin page.
    if (!chrome) return;
    if (!open || trigger === "always") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trigger, chrome]);

  return (
    <div
      className={`fixed inset-0 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
      style={{ zIndex: z }}
    >
      {trigger !== "always" && (
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={close}
        />
      )}

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className={`absolute top-0 right-0 h-full w-full overflow-y-auto backdrop-blur-sm text-zinc-100 shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ maxWidth: widthMaxPx, backgroundColor: bgRgba }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <span className="text-lg font-semibold tracking-wide">Menu</span>
          {trigger !== "always" && (
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <line x1="6" y1="6"  x2="18" y2="18" />
                <line x1="18" y1="6" x2="6"  y2="18" />
              </svg>
            </button>
          )}
        </div>

        {decorationTopUrl && (
          <div className="flex w-full items-center justify-center px-6 pt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={decorationTopUrl}
              alt={c.decoration_top_alt ?? ""}
              style={{ maxHeight: decorationTopHeight }}
              className="max-w-full object-contain"
            />
          </div>
        )}

        <nav className="px-6 py-6">
          {user ? (
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3">
              <UserAvatar user={user} size="h-10 w-10" ringColor="white" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">
                  {user.display_name || user.username || user.email}
                </div>
                <div className="truncate text-xs text-white/60">{user.email}</div>
              </div>
              {(user.role === "admin" || user.role === "superadmin") && (
                <Link
                  href="/admin"
                  onClick={close}
                  className="shrink-0 rounded-full bg-anamaya-green px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
                >
                  Admin
                </Link>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                const callbackUrl = `${window.location.origin}/auth/callback`;
                window.location.href = getSSOLoginUrl(callbackUrl);
              }}
              className="mb-6 flex w-full items-center gap-3 rounded-lg bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Sign In
            </button>
          )}

          <ul className="space-y-1">
            {items.map((item) => (
              <MenuItem
                key={item.label}
                item={item}
                onNavigate={close}
                headlineFontClass={headlineFontClass}
                headlineStyle={headlineStyle}
                contentFontClass={contentFontClass}
                contentStyle={contentStyle}
              />
            ))}
          </ul>

          <Link
            href={ctaHref}
            onClick={close}
            className="mt-8 block rounded-full bg-anamaya-green px-5 py-3 text-center text-sm font-semibold tracking-wide text-white transition-colors hover:bg-anamaya-green-dark"
          >
            {ctaLabel}
          </Link>
        </nav>

        {decorationBottomUrl && (
          <div className="flex w-full items-center justify-center px-6 pb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={decorationBottomUrl}
              alt={c.decoration_bottom_alt ?? ""}
              style={{ maxHeight: decorationBottomHeight }}
              className="max-w-full object-contain"
            />
          </div>
        )}
      </aside>
    </div>
  );
}

function MenuItem({
  item,
  onNavigate,
  headlineFontClass,
  headlineStyle,
  contentFontClass,
  contentStyle,
}: {
  item: UiNavItem;
  onNavigate: () => void;
  headlineFontClass: string;
  headlineStyle: CSSProperties;
  contentFontClass: string;
  contentStyle: CSSProperties;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!item.children?.length) {
    return (
      <li>
        <Link
          href={item.href ?? "#"}
          onClick={onNavigate}
          className={`block rounded-md px-3 py-2 transition-colors hover:bg-white/10 ${headlineFontClass}`}
          style={headlineStyle}
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
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-white/10 ${headlineFontClass}`}
        style={headlineStyle}
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
                className={`block rounded-md px-3 py-1.5 transition-colors hover:bg-white/10 hover:text-white ${contentFontClass}`}
                style={contentStyle}
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
