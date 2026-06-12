// Conversion event helpers — thin wrappers over GA4 (gtag) and Meta Pixel
// (fbq), both already loaded by SiteTracking / the snapshot tags. Every
// helper is a safe no-op if the underlying library hasn't loaded yet, so
// callers never need to guard. Event names are mirrored verbatim in the
// snapshot inline script (src/lib/snapshot/transforms.ts) so native and
// snapshot pages report ONE consistent stream.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function ga(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, params ?? {});
  }
}
function meta(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", event, params ?? {});
  }
}

/** Click on a "Book / Check availability / Calendar" CTA (→ Retreat Guru). */
export function trackBookingClick(label?: string) {
  ga("booking_click", { label });
  meta("InitiateCheckout", { content_category: "retreat_booking", content_name: label });
}

/** A lead/info-request form was submitted (newsletter, contact, enquiry). */
export function trackLead(formName?: string) {
  ga("generate_lead", { form_name: formName });
  meta("Lead", { content_name: formName ?? "form" });
}

/** A pricing / rates page (or section) was viewed. */
export function trackPricingView(label?: string) {
  ga("view_pricing", { label });
  meta("ViewContent", { content_type: "pricing", content_name: label });
}

export {};
