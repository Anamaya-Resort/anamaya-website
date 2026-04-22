// Shared utilities for extractor scripts.
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

export function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
  return v;
}

export type SiteLabel = "v1" | "v2";

export function resolveSite(): { label: SiteLabel; baseUrl: string } {
  const label = (process.env.SITE ?? "v1") as SiteLabel;
  if (label !== "v1" && label !== "v2") {
    console.error(`SITE must be 'v1' or 'v2', got '${label}'`);
    process.exit(1);
  }
  const key = label === "v1" ? "WP_SOURCE_URL_V1" : "WP_SOURCE_URL_V2";
  const baseUrl = requireEnv(key).replace(/\/$/, "");
  return { label, baseUrl };
}

export function sb(): SupabaseClient {
  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}

/** Chunk helper for bulk ops. */
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** URL path or the URL itself on parse failure. */
export function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/** Paginated REST fetch returning every item. */
export async function restPaginate<T>(
  baseUrl: string,
  path: string,
  params: Record<string, string | number> = {},
): Promise<T[]> {
  const out: T[] = [];
  const perPage = Number(params.per_page ?? 100);
  let page = 1;
  let totalPages = 1;

  while (true) {
    const q = new URLSearchParams({
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      per_page: String(perPage),
      page: String(page),
    });
    const url = `${baseUrl}${path}?${q}`;
    const res = await fetch(url);

    if (res.status === 400) {
      const body = await res.json().catch(() => null);
      if (body?.code === "rest_post_invalid_page_number") break;
      throw new Error(`GET ${path} page ${page}: ${JSON.stringify(body)}`);
    }
    if (!res.ok) throw new Error(`GET ${path} page ${page}: HTTP ${res.status}`);

    if (page === 1) {
      totalPages = parseInt(res.headers.get("X-WP-TotalPages") ?? "1", 10);
    }

    const batch = (await res.json()) as T[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);

    if (page >= totalPages) break;
    page++;
  }

  return out;
}
