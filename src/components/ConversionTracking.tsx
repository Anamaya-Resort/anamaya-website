"use client";

import { useEffect } from "react";
import { trackBookingClick, trackLead, trackPricingView } from "@/lib/analytics/events";

// Conversion tracking for the NATIVE pages. Mirrors the inline script that
// applySnapshotTransforms injects into snapshot pages, so both report the
// same events. Three signals:
//   1. booking intent  — clicks on any link to the Retreat Guru calendar
//   2. pricing view    — landing on a rates/pricing page (path heuristic)
//   3. lead            — best-effort: a Sereenly/GHL embedded form posts a
//                        submit message (authoritative lead tracking should
//                        ALSO be configured inside GHL's form settings)

const BOOKING_RE = /\/rg-calendar|retreat\.guru/i;
const PRICING_RE = /(^|\/)(rates?|pricing|prices?)(\/|$)/i;

export default function ConversionTracking() {
  useEffect(() => {
    if (PRICING_RE.test(window.location.pathname)) {
      trackPricingView(document.title);
    }

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (BOOKING_RE.test(href)) {
        trackBookingClick(a.textContent?.trim().slice(0, 80) || href);
      }
    };
    document.addEventListener("click", onClick, true);

    let leadFired = false;
    const onMessage = (e: MessageEvent) => {
      if (leadFired) return;
      if (!/sereenly\.com|msgsndr\.com/i.test(e.origin || "")) return;
      const data = typeof e.data === "string" ? e.data : JSON.stringify(e.data ?? "");
      if (/\b(form[_-]?submit|submitted|onFormSubmit|lead)\b/i.test(data)) {
        leadFired = true;
        trackLead();
      }
    };
    window.addEventListener("message", onMessage);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}
