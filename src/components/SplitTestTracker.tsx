"use client";

import { useEffect } from "react";

// A booking-intent CTA (links to the Retreat Guru calendar). Mirrors the RE
// in ConversionTracking so the split test's conversion matches the GA one.
const BOOKING_RE = /\/rg-calendar|retreat\.guru/i;

/**
 * First-party split-test capture for the version currently shown at this URL.
 * Rendered only when a split is live. Persists the sticky visitor id, logs an
 * impression on load, a cta_click when a booking CTA is clicked, and a dwell
 * (time on page) when the visitor leaves. Attributed to `variantId`.
 */
export default function SplitTestTracker({
  groupId,
  variantId,
  vid,
}: {
  groupId: string;
  variantId: string;
  vid: string;
}) {
  useEffect(() => {
    // Persist the assignment so future loads are sticky and server-computed.
    try {
      document.cookie = `ab_vid=${vid}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // cookies disabled → assignment falls back to per-request, still fine
    }

    const send = (type: "impression" | "cta_click" | "dwell", dwellMs?: number) => {
      const payload = JSON.stringify({ groupId, variantId, vid, type, dwellMs });
      try {
        if (type === "dwell" && navigator.sendBeacon) {
          navigator.sendBeacon(
            "/api/split-test",
            new Blob([payload], { type: "application/json" }),
          );
          return;
        }
      } catch {
        // fall through to fetch
      }
      void fetch("/api/split-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    };

    send("impression");

    const start = Date.now();
    let dwellSent = false;
    const sendDwell = () => {
      if (dwellSent) return;
      dwellSent = true;
      send("dwell", Date.now() - start);
    };

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (BOOKING_RE.test(href)) send("cta_click");
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendDwell();
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", sendDwell);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", sendDwell);
    };
  }, [groupId, variantId, vid]);

  return null;
}
