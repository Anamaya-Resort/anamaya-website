"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactionsContent } from "@/types/blocks";

/**
 * Reaction widget as a native block. Drops at the bottom of an article/post
 * template. Reads the current page path at runtime (so it's article-agnostic
 * — the same block works on every post), records one vote per device via
 * /api/reactions, and pings /api/views on mount.
 *
 * Level 1=LIKE, 2=LOVE, 3=MARRY; the heart is brand terracotta and grows
 * with the level; the label reads LIKED / LOVED / TRULY LOVED.
 */

const STORE = "anamaya_reactions";
const VIDK = "anamaya_vid";
const LABELS: Record<number, string> = {
  0: "Rate this post",
  1: "Liked",
  2: "Loved",
  3: "Truly Loved",
};
// Heart size (px) by level.
const SIZE: Record<number, number> = { 0: 28, 1: 24, 2: 32, 3: 42 };

function readVid(): string {
  try {
    let v = localStorage.getItem(VIDK);
    if (!v) {
      v = "v" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VIDK, v);
    }
    return v;
  } catch {
    return "v" + Math.random().toString(36).slice(2);
  }
}
function readStore(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "{}");
  } catch {
    return {};
  }
}
function writeLevel(path: string, level: number) {
  try {
    const s = readStore();
    if (level) s[path] = level;
    else delete s[path];
    localStorage.setItem(STORE, JSON.stringify(s));
  } catch {
    /* storage disabled — reaction still posts, just not remembered */
  }
}

function Heart({ level }: { level: number }) {
  const px = SIZE[level] ?? 28;
  const filled = level > 0;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      style={{ transition: "width .18s ease, height .18s ease", display: "inline-block", verticalAlign: "middle" }}
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? "#ae564b" : "none"}
        stroke={filled ? "#ae564b" : "#b3b0a6"}
        strokeWidth={2}
        style={{ transition: "fill .18s, stroke .18s" }}
      />
    </svg>
  );
}

export default function ReactionsBlock({
  content,
  preview,
}: {
  content: ReactionsContent | null;
  /** Admin block-preview only: seed a representative "loved" state and skip
   *  the view/reaction pings so the bar shows with no post attached. */
  preview?: boolean;
}) {
  const c = content ?? {};
  // In preview, fall back to a sample heading so the bar reads as populated.
  const heading = c.heading ?? (preview ? "Enjoyed this post?" : "");
  const question = c.modal_question ?? "How do you feel about this post?";
  const padY = c.padding_y_px ?? 40;
  const align = c.align ?? "center";

  // Preview seeds a "Loved" reaction so the heart shows at full size.
  const [level, setLevel] = useState(preview ? 2 : 0);
  const [open, setOpen] = useState(false);
  const pathRef = useRef<string>("");

  useEffect(() => {
    // Admin preview: no real post path, so don't read storage or ping the API.
    if (preview) return;
    const path = window.location.pathname;
    pathRef.current = path;
    setLevel(readStore()[path] || 0);
    // Fire-and-forget view ping (counts once server-side per unique visitor).
    fetch("/api/views", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ path }),
    }).catch(() => {});
  }, [preview]);

  const choose = useCallback((next: number) => {
    const path = pathRef.current;
    setLevel(next);
    writeLevel(path, next);
    setOpen(false);
    fetch("/api/reactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ path, visitorId: readVid(), level: next }),
    }).catch(() => {});
  }, []);

  const labelColor = level > 0 ? "#ae564b" : "#8b917f";
  const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <section
      className="w-full"
      style={{ paddingTop: padY, paddingBottom: padY }}
    >
      <div
        className="mx-auto flex max-w-3xl flex-col items-center gap-3 border-t border-anamaya-mint/60 px-6 pt-7"
        style={{ alignItems: align === "center" ? "center" : justify, textAlign: align }}
      >
        {heading && (
          <p className="font-heading text-sm uppercase tracking-[0.14em] text-anamaya-olive-dark">
            {heading}
          </p>
        )}
        <div className="inline-flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="React to this post"
            className="inline-flex cursor-pointer items-center border-0 bg-transparent p-1.5 leading-none"
          >
            <Heart level={level} />
          </button>
          <span
            className="font-heading text-[13px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: labelColor }}
          >
            {LABELS[level]}
          </span>
        </div>
        {preview && (
          <span className="text-xs italic text-anamaya-charcoal/50">
            Loved by 128 readers
          </span>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-5"
          style={{ background: "rgba(18,26,14,.55)", backdropFilter: "blur(2px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Rate this post"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
          >
            <p className="mb-4 font-heading text-[15px] uppercase tracking-[0.06em] text-anamaya-olive-dark">
              {question}
            </p>
            <button
              type="button"
              onClick={() => choose(1)}
              className="mb-2.5 block w-full cursor-pointer rounded-lg border-0 bg-anamaya-green px-3.5 py-3 font-heading text-sm font-semibold uppercase tracking-[0.08em] text-[#14200a] transition-colors hover:bg-anamaya-green-dark"
            >
              LIKE post
            </button>
            <button
              type="button"
              onClick={() => choose(2)}
              className="mb-2.5 block w-full cursor-pointer rounded-lg border-0 bg-anamaya-green px-3.5 py-3 font-heading text-sm font-semibold uppercase tracking-[0.08em] text-[#14200a] transition-colors hover:bg-anamaya-green-dark"
            >
              LOVE post
            </button>
            <button
              type="button"
              onClick={() => choose(3)}
              className="mb-1.5 block w-full cursor-pointer rounded-lg border-0 bg-anamaya-accent px-3.5 py-3 font-heading text-[12.5px] font-semibold uppercase leading-tight tracking-[0.08em] text-white transition-colors hover:brightness-95"
            >
              I WANT TO MARRY AND HAVE CHILDREN WITH THIS POST
            </button>
            {level > 0 && (
              <button
                type="button"
                onClick={() => choose(0)}
                className="mt-1.5 block w-full cursor-pointer border-0 bg-transparent py-2 font-heading text-xs uppercase tracking-[0.1em] text-anamaya-charcoal/50 hover:text-anamaya-charcoal"
              >
                Clear my reaction
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
