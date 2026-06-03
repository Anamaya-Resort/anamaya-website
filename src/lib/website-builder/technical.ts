import "server-only";
import { supabaseServerOrNull } from "@/lib/supabase-server";

// "Technical" documents — machine-facing site files (not human content).
// Stored as singleton rows in site_settings (key → JSON value), matching
// the existing general / default_meta / tracking pattern. Reads tolerate a
// missing/empty row and return sensible defaults.

export type RobotsConfig = { custom: string };
export type SitemapConfig = { extra_urls: string; exclude_paths: string };
export type SchemaConfig = { global_jsonld: string };

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

// Production launch domain — canonical host for robots/sitemap output.
export const SITE_BASE_URL = "https://anamaya.com";

export const TECHNICAL_DOCS = [
  { id: "tracking", label: "Tracking & Tags" },
  { id: "robots", label: "robots.txt" },
  { id: "sitemap", label: "Sitemap" },
  { id: "schema", label: "Structured Data" },
  { id: "meta", label: "Default Meta & OG" },
] as const;

export type TechnicalDocId = (typeof TECHNICAL_DOCS)[number]["id"];
