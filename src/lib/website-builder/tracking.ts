import "server-only";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import { getAllSettings, type TrackingSettings } from "./settings";
import { POST_TYPES } from "./post-types";

// A head/footer code pair. "body" = footer (injected at end of <body>).
export type CodeSlot = { head_html: string; body_html: string };

// The templates a user can attach tracking to. We use the post-type
// registry (one template per content type) rather than the sparse
// page_templates table, so the dropdown is complete and intuitive.
export const TEMPLATE_OPTIONS: { slug: string; label: string }[] = POST_TYPES.map(
  (pt) => ({ slug: pt.templateSlug, label: pt.pluralLabel }),
);

export function templateLabel(slug: string): string {
  return TEMPLATE_OPTIONS.find((t) => t.slug === slug)?.label ?? slug;
}

/** Global tracking (GA4/GTM/Pixel + custom head/body) from site_settings. */
export async function getGlobalTracking(): Promise<TrackingSettings> {
  return (await getAllSettings()).tracking;
}

/** A short human summary of the structured global tags, for greyed-out notes. */
export function globalTagSummary(t: TrackingSettings): string {
  const parts = [
    t.ga4_id && `GA4 ${t.ga4_id}`,
    t.gtm_id && `GTM ${t.gtm_id}`,
    t.facebook_pixel_id && `Meta Pixel ${t.facebook_pixel_id}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "none set";
}

// Reads tolerate the tables not existing yet (pre-migration) — they return
// empty rather than throwing, so the admin UI renders cleanly either way.
export async function getTemplateTracking(slug: string): Promise<CodeSlot> {
  const sb = supabaseServerOrNull();
  if (!sb) return { head_html: "", body_html: "" };
  const { data } = await sb
    .from("template_tracking")
    .select("head_html, body_html")
    .eq("template_slug", slug)
    .maybeSingle();
  return { head_html: data?.head_html ?? "", body_html: data?.body_html ?? "" };
}

export async function getPageTracking(urlInventoryId: string): Promise<CodeSlot> {
  const sb = supabaseServerOrNull();
  if (!sb) return { head_html: "", body_html: "" };
  const { data } = await sb
    .from("page_tracking")
    .select("head_html, body_html")
    .eq("url_inventory_id", urlInventoryId)
    .maybeSingle();
  return { head_html: data?.head_html ?? "", body_html: data?.body_html ?? "" };
}
