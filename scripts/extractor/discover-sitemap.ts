// Phase 1 URL discovery via Yoast sitemap index, multi-site aware (SITE=v1|v2).
// Complements discover-urls.ts (REST) by surfacing archives, taxonomies,
// and anything not in a standard post type.

import { sb, resolveSite, chunk } from "./lib";
import { XMLParser } from "fast-xml-parser";

const xml = new XMLParser({ ignoreAttributes: true });

type SitemapClass =
  | { kind: "content"; post_type: string; template_slug: string }
  | { kind: "archive"; template_slug: string }
  | { kind: "taxonomy"; template_slug: string };

const SITEMAP_CLASS: Record<string, SitemapClass> = {
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

  category: { kind: "archive", template_slug: "wp-category-archive" },
  post_tag: { kind: "archive", template_slug: "wp-tag-archive" },
  author:   { kind: "archive", template_slug: "wp-author-archive" },
};

async function fetchXml(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url}: HTTP ${res.status}`);
  return xml.parse(await res.text());
}

function sitemapPrefix(sitemapUrl: string): string {
  const path = new URL(sitemapUrl).pathname;
  const m = path.match(/\/([^/]+?)-sitemap\.xml$/);
  return m ? m[1] : "";
}

function extractLocs(parsed: any, key: "urlset" | "sitemapindex"): string[] {
  const root = parsed?.[key];
  if (!root) return [];
  const entries = key === "urlset" ? root.url : root.sitemap;
  const list = Array.isArray(entries) ? entries : entries ? [entries] : [];
  return list.map((e: any) => e.loc).filter((l: any) => typeof l === "string");
}

async function main() {
  const { label, baseUrl } = resolveSite();
  const client = sb();

  const indexUrl = `${baseUrl}/sitemap_index.xml`;
  console.log(`→ [${label}] ${indexUrl}`);

  const index = await fetchXml(indexUrl);
  const subs = extractLocs(index, "sitemapindex");
  console.log(`→ ${subs.length} sub-sitemaps`);

  const unknownPrefixes: string[] = [];
  let grandInserted = 0;
  let grandUpdated = 0;

  for (const sub of subs) {
    const prefix = sitemapPrefix(sub);
    if (!prefix) continue;

    let cls = SITEMAP_CLASS[prefix];
    if (!cls) {
      cls = { kind: "taxonomy", template_slug: `archive-${prefix}` };
      unknownPrefixes.push(prefix);
    }

    // Ensure template exists
    const { data: existingTpl } = await client
      .from("templates")
      .select("id")
      .eq("slug", cls.template_slug)
      .maybeSingle();
    let templateId = existingTpl?.id ?? null;
    if (!templateId) {
      const { data, error } = await client
        .from("templates")
        .insert({
          slug: cls.template_slug,
          name: cls.template_slug,
          kind: cls.template_slug.startsWith("wp-") ? "wp-builtin" : "theme",
          is_archive: cls.kind !== "content",
        })
        .select("id")
        .single();
      if (error) throw error;
      templateId = data.id;
    }

    const parsed = await fetchXml(sub);
    const urls = extractLocs(parsed, "urlset");

    // Classify and build entries
    const entries = urls.map((u) => ({
      source_site: label,
      url: u,
      url_path: new URL(u).pathname,
      url_kind: cls.kind,
      post_type: cls.kind === "content" ? (cls as any).post_type : null,
      template_id: templateId,
      template_guess:
        cls.kind === "content" ? `single-${(cls as any).post_type}` : cls.template_slug,
    }));

    // Fetch existing (source_site, url) pairs in this batch to decide insert vs update
    const { data: existing } = await client
      .from("url_inventory")
      .select("url, source_flags")
      .eq("source_site", label)
      .in("url", entries.map((e) => e.url));
    const existingMap = new Map<string, Record<string, unknown>>();
    for (const r of existing ?? [])
      existingMap.set(r.url, r.source_flags ?? {});

    const newRows: any[] = [];
    const updates: { url: string; flags: Record<string, unknown> }[] = [];

    for (const e of entries) {
      if (existingMap.has(e.url)) {
        updates.push({
          url: e.url,
          flags: { ...existingMap.get(e.url), sitemap: true },
        });
      } else {
        newRows.push({
          ...e,
          source_flags: { sitemap: true },
          status: "discovered",
        });
      }
    }

    for (const c of chunk(newRows, 200)) {
      const { error } = await client.from("url_inventory").insert(c);
      if (error) throw new Error(`insert new rows: ${error.message}`);
    }
    for (const u of updates) {
      const { error } = await client
        .from("url_inventory")
        .update({ source_flags: u.flags })
        .eq("source_site", label)
        .eq("url", u.url);
      if (error) throw new Error(`update ${u.url}: ${error.message}`);
    }

    console.log(
      `  ${prefix.padEnd(26)} ${String(urls.length).padStart(5)}  ` +
        `(${newRows.length} new, ${updates.length} flagged)`,
    );
    grandInserted += newRows.length;
    grandUpdated += updates.length;
  }

  console.log(
    `\n✓ [${label}] ${grandInserted} new URLs, ${grandUpdated} existing rows flagged with sitemap.`,
  );
  if (unknownPrefixes.length) {
    console.log(
      `Unrecognized prefixes (auto-classed as taxonomy): ${unknownPrefixes.join(", ")}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
