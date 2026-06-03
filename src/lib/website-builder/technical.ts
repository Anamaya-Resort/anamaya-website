import "server-only";
import { supabaseServerOrNull } from "@/lib/supabase-server";

// "Technical" documents — machine-facing site files (not human content).
// Stored as singleton rows in site_settings (key → JSON value), matching
// the existing general / default_meta / tracking pattern. Reads tolerate a
// missing/empty row and return sensible defaults.

export type RobotsConfig = { custom: string };
export type SitemapConfig = { extra_urls: string; exclude_paths: string };
export type SchemaConfig = { global_jsonld: string };
export type VerificationConfig = {
  google: string;
  bing: string;
  pinterest: string;
  facebook: string;
  custom_head: string;
};
export type SecurityHeadersConfig = {
  csp: string;
  hsts: string; // "true" when enabled, "" otherwise (checkbox flag)
  referrer_policy: string;
  permissions_policy: string;
  x_frame_options: string;
};
export type SharingConfig = {
  app_name: string;
  short_name: string;
  theme_color: string;
  background_color: string;
  og_image: string;
  square_image: string;
  favicon: string;
  icon_192: string;
  icon_512: string;
  apple_touch: string;
};

// Image slots for the Social & Icons tab. One universal Open Graph image
// covers Facebook, WhatsApp, Telegram, LinkedIn, X, iMessage, Slack and
// Discord (they all read og:image) — not one image per app. Instagram
// shows no link previews, so it has no slot.
export const SHARING_IMAGE_SLOTS: {
  field: keyof SharingConfig;
  label: string;
  recommended: string;
  note: string;
}[] = [
  { field: "og_image", label: "Social share image", recommended: "1200 × 630 (1.91:1)", note: "Used by Facebook, WhatsApp, Telegram, LinkedIn, X, iMessage, Slack, Discord." },
  { field: "square_image", label: "Square share image", recommended: "1200 × 1200 (1:1)", note: "Fallback some apps prefer (e.g. WhatsApp thumbnails)." },
  { field: "apple_touch", label: "Apple touch icon", recommended: "180 × 180", note: "iOS home-screen icon." },
  { field: "icon_512", label: "App icon (large)", recommended: "512 × 512", note: "PWA / Android / splash." },
  { field: "icon_192", label: "App icon", recommended: "192 × 192", note: "PWA / Android." },
  { field: "favicon", label: "Favicon", recommended: "32 × 32 (or .ico/.svg)", note: "Browser tab icon." },
];

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  const sb = supabaseServerOrNull();
  if (!sb) return fallback;
  const { data } = await sb.from("site_settings").select("value").eq("key", key).maybeSingle();
  return { ...fallback, ...((data?.value as Partial<T>) ?? {}) };
}

export function getRobotsConfig(): Promise<RobotsConfig> {
  return readSetting<RobotsConfig>("robots", { custom: "" });
}
export function getSitemapConfig(): Promise<SitemapConfig> {
  return readSetting<SitemapConfig>("sitemap_config", { extra_urls: "", exclude_paths: "" });
}
export function getSchemaConfig(): Promise<SchemaConfig> {
  return readSetting<SchemaConfig>("schema", { global_jsonld: "" });
}
export function getVerificationConfig(): Promise<VerificationConfig> {
  return readSetting<VerificationConfig>("verification", {
    google: "", bing: "", pinterest: "", facebook: "", custom_head: "",
  });
}
export function getSecurityHeadersConfig(): Promise<SecurityHeadersConfig> {
  return readSetting<SecurityHeadersConfig>("security_headers", {
    csp: "", hsts: "", referrer_policy: "", permissions_policy: "", x_frame_options: "",
  });
}
export function getSharingConfig(): Promise<SharingConfig> {
  return readSetting<SharingConfig>("sharing", {
    app_name: "", short_name: "", theme_color: "#A0BF52", background_color: "#ffffff",
    og_image: "", square_image: "", favicon: "", icon_192: "", icon_512: "", apple_touch: "",
  });
}

// Production launch domain — canonical host for robots/sitemap output.
export const SITE_BASE_URL = "https://anamaya.com";

export const TECHNICAL_DOCS = [
  { id: "tracking", label: "Tracking & Tags" },
  { id: "robots", label: "robots.txt" },
  { id: "sitemap", label: "Sitemap" },
  { id: "schema", label: "Structured Data" },
  { id: "meta", label: "Default Meta" },
  { id: "verification", label: "Site Verification" },
  { id: "security", label: "Security Headers" },
  { id: "sharing", label: "Social & Icons" },
] as const;

export type TechnicalDocId = (typeof TECHNICAL_DOCS)[number]["id"];
