// Phase 1 URL discovery via Yoast sitemap index.
// Complements discover-urls.ts (REST) by surfacing archives, taxonomies,
// and anything not in a standard post type.
//
// Behavior:
//  - URLs already in url_inventory have source_flags.sitemap merged in (other fields untouched).
//  - URLs new to inventory are inserted with appropriate url_kind + template_id.
//  - Custom taxonomies discovered in the index get their own 'theme' template rows.

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { XMLParser } from "fast-xml-parser";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WP_SOURCE_URL = process.env.WP_SOURCE_URL ?? "https://anamaya.com";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const xml = new XMLParser({ ignoreAttributes: true });

type SitemapClass =
  | { kind: "content"; post_type: string; template_slug: string }
  | { kind: "archive"; template_slug: string }
  | { kind: "taxonomy"; template_slug: string };

// Classify each sub-sitemap based on its filename prefix.
// Keys are the prefix (e.g. 'page' from 'page-sitemap.xml').
// Anything not listed is treated as an unknown taxonomy and a template is created on the fly.
const SITEMAP_CLASS: Record<string, SitemapClass> = {
  // Content (post-type) sitemaps
  page:               { kind: "content", post_type: "page",               template_slug: "single-page" },
  accommodations:     { kind: "content", post_type: "accommodations",     template_slug: "single-accommodations" },
  guest_yoga_teacher: { kind: "content", post_type: "guest_yoga_teacher", template_slug: "single-guest_yoga_teacher" },
  news_coverage:      { kind: "content", post_type: "news_coverage",      template_slug: "single-news_coverage" },
  retreat:            { kind: "content", post_type: "retreat",            template_slug: "single-retreat" },
  guest_testimonials: { kind: "content", post_type: "guest_testimonials", template_slug: "single-guest_testimonials" },
  ytt:                { kind: "content", post_type: "ytt",                template_slug: "single-ytt" },
  yoga_teacher:       { kind: "content", post_type: "yoga_teacher",       template_slug: "single-yoga_teacher" },
  cp_recipe:          { kind: "content", post_type: "cp_recipe",          template_slug: "single-cp_recipe" },
  post:               { kind: "content", post_type: "post",               template_slug: "single-post" },

  // WP built-in archives
  category: { kind: "archive",  template_slug: "wp-category-archive" },
  post_tag: { kind: "archive",  template_slug: "wp-tag-archive" },
  author:   { kind: "archive",  template_slug: "wp-author-archive" },
};

async function fetchXml(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url}: HTTP ${res.status}`);
  return xml.parse(await res.text());
}

function sitemapPrefix(sitemapUrl: string): string {
  // e.g. https://anamaya.com/retreat-sitemap.xml -> 'retreat'
  const path = new URL(sitemapUrl).pathname;
  const match = path.match(/\/([^/]+?)-sitemap\.xml$/);
  return match ? match[1] : "";
}

function extractLocs(parsed: any, key: "urlset" | "sitemapindex"): string[] {
  const root = parsed?.[key];
  if (!root) return [];
  const entries = key === "urlset" ? root.url : root.sitemap;
  const list = Array.isArray(entries) ? entries : entries ? [entries] : [];
  return list.map((e: any) => e.loc).filter((l: any) => typeof l === "string");
}

async function getOrCreateTemplate(
  slug: string,
  opts: { name?: string; kind?: "theme" | "wp-builtin"; is_archive?: boolean } = {},
): Promise<string> {
  const { data: existing } = await sb
    .from("templates")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await sb
    .from("templates")
    .insert({
      slug,
      name: opts.name ?? slug,
      kind: opts.kind ?? "theme",
      is_archive:
        opts.is_archive ??
        (slug.startsWith("archive-") || slug.endsWith("-archive")),
    })
    .select("id")
    .single();
  if (error) throw new Error(`template ${slug}: ${error.message}`);
  return data.id;
}

type NormalizedEntry = {
  url: string;
  url_path: string;
  url_kind: "content" | "archive" | "taxonomy";
  post_type: string | null;
  template_id: string | null;
};

async function normalizeSitemap(
  prefix: string,
  urls: string[],
): Promise<NormalizedEntry[]> {
  let cls = SITEMAP_CLASS[prefix];
  if (!cls) {
    // Unknown prefix -> treat as custom taxonomy and create template on the fly.
    cls = { kind: "taxonomy", template_slug: `archive-${prefix}` };
  }

  const templateId = await getOrCreateTemplate(cls.template_slug, {
    name: cls.template_slug,
    kind: cls.template_slug.startsWith("wp-") ? "wp-builtin" : "theme",
    is_archive: cls.kind !== "content",
  });

  return urls.map((u) => ({
    url: u,
    url_path: new URL(u).pathname,
    url_kind: cls.kind,
    post_type: cls.kind === "content" ? (cls as any).post_type : null,
    template_id: templateId,
  }));
}

async function upsertSitemapEntries(entries: NormalizedEntry[]) {
  if (entries.length === 0) return { inserted: 0, updated: 0 };

  const urls = entries.map((e) => e.url);
  const existingFlags = new Map<string, Record<string, unknown>>();

  // Fetch existing source_flags in chunks (Supabase .in() tops out around 1000 ids safely)
  const chunkSize = 500;
  for (let i = 0; i < urls.length; i += chunkSize) {
    const { data, error } = await sb
      .from("url_inventory")
      .select("url, source_flags")
      .in("url", urls.slice(i, i + chunkSize));
    if (error) throw error;
    for (const r of data ?? []) existingFlags.set(r.url, r.source_flags ?? {});
  }

  const newRows: any[] = [];
  const updates: { url: string; source_flags: Record<string, unknown> }[] = [];

  for (const e of entries) {
    const existing = existingFlags.get(e.url);
    if (existing) {
      updates.push({ url: e.url, source_flags: { ...existing, sitemap: true } });
    } else {
      newRows.push({
        url: e.url,
        url_path: e.url_path,
        url_kind: e.url_kind,
        post_type: e.post_type,
        template_id: e.template_id,
        template_guess: e.post_type ? `single-${e.post_type}` : null,
        source_flags: { sitemap: true },
        found_in_v1: true,
        status: "discovered",
      });
    }
  }

  // Insert new rows in chunks
  for (let i = 0; i < newRows.length; i += 200) {
    const chunk = newRows.slice(i, i + 200);
    const { error } = await sb.from("url_inventory").insert(chunk);
    if (error) throw new Error(`insert @${i}: ${error.message}`);
  }

  // Update existing rows: individual updates (small batches so fine)
  for (const u of updates) {
    const { error } = await sb
      .from("url_inventory")
      .update({ source_flags: u.source_flags })
      .eq("url", u.url);
    if (error) throw new Error(`update ${u.url}: ${error.message}`);
  }

  return { inserted: newRows.length, updated: updates.length };
}

async function main() {
  const indexUrl = `${WP_SOURCE_URL}/sitemap_index.xml`;
  console.log(`→ ${indexUrl}`);

  const index = await fetchXml(indexUrl);
  const subs = extractLocs(index, "sitemapindex");
  console.log(`→ ${subs.length} sub-sitemaps`);

  const unknownPrefixes: string[] = [];
  let grandInserted = 0;
  let grandUpdated = 0;

  for (const sub of subs) {
    const prefix = sitemapPrefix(sub);
    if (!prefix) {
      console.warn(`  ? could not classify ${sub}, skipping`);
      continue;
    }
    if (!SITEMAP_CLASS[prefix]) unknownPrefixes.push(prefix);

    const parsed = await fetchXml(sub);
    const urls = extractLocs(parsed, "urlset");

    const normalized = await normalizeSitemap(prefix, urls);
    const { inserted, updated } = await upsertSitemapEntries(normalized);

    console.log(
      `  ${prefix.padEnd(26)} ${String(urls.length).padStart(5)} URLs ` +
        `(${inserted} new, ${updated} existing flagged)`,
    );

    grandInserted += inserted;
    grandUpdated += updated;
  }

  console.log(
    `\n✓ Sitemap pass done. ${grandInserted} new URLs, ${grandUpdated} existing rows flagged with source_flags.sitemap=true.`,
  );

  if (unknownPrefixes.length) {
    console.log(
      `\nNote: unrecognized sub-sitemap prefixes (auto-classed as 'taxonomy'): ${unknownPrefixes.join(", ")}`,
    );
  }
}

main().catch((err) => {
  console.error("\n✗ Failed:", err);
  process.exit(1);
});
