import "server-only";
import { supabaseServerOrNull } from "./supabase-server";
import { candidateBaseUrls, rewriteHtml } from "./wp-rewrite";

// Hosts whose absolute URLs inside content should be stripped to path-only
// (so internal links become relative on the new site).
const WP_HOSTS = ["anamayastg.wpenginepowered.com", "anamaya.com"];

export type RetreatCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  date_published: string | null;
  date_modified: string | null;
  featured_image_url: string | null;
  category: string | null;
};

export type RetreatDetail = RetreatCard & {
  wp_id: number;
  body_html: string;
  author: { display_name: string; slug: string; avatar_url: string | null } | null;
  seo: {
    title: string | null;
    description: string | null;
    og_image: string | null;
    canonical: string | null;
  } | null;
};

// Shapes for the loosely-typed Supabase joins below (the generated DB
// types don't carry the embedded relation / scraped columns).
type TermNode = { taxonomy: string; name: string };
type TermJoin = { url_inventory_id: string; taxonomy_terms: TermNode | TermNode[] | null };
type TermOnly = { taxonomy_terms: TermNode | TermNode[] | null };
type ContentBody = { scraped_body_html?: string | null; content_rendered?: string | null };

function slugFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    // /retreat/the-slug/  ->  the-slug
    const m = path.match(/\/retreat\/([^/]+)\/?$/);
    return m ? m[1] : path.replace(/\/$/, "").split("/").pop() ?? "";
  } catch {
    return "";
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8217;/g, "’")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8230;/g, "…")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanExcerpt(html: string | null): string | null {
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return decodeEntities(text).slice(0, 280);
}

/** List all published retreats, newest-modified first.
 *
 * Source-agnostic / newest-wins: retreats live on staging (v2) and/or
 * production (v1). We pull both, dedupe by slug keeping the most-recently
 * modified, so a v1-newer retreat shows its v1 card and a v1-only retreat
 * (≈15 that never reached staging) appears at all. Featured image + body
 * come from different tables per source: v2 maps featured_media_wp_id →
 * media_items; v1 retreats were populated (populate-v1-retreats.ts) with
 * the hero in seo_meta.og_image and Storage URLs already in the body. */
export async function listRetreats(): Promise<RetreatCard[]> {
  const sb = supabaseServerOrNull();
  if (!sb) return [];

  const { data: rows, error } = await sb
    .from("url_inventory")
    .select("id, url, title, wp_id, date_published, date_modified, featured_media_wp_id, source_site")
    .in("source_site", ["v1", "v2"])
    .eq("post_type", "retreat")
    .not("title", "is", null)
    .not("wp_id", "is", null)
    // exclude the archive URLs themselves
    .neq("url", "https://anamayastg.wpenginepowered.com/retreats/")
    .neq("url", "https://anamaya.com/retreats/")
    .order("date_modified", { ascending: false })
    .limit(400);
  if (error || !rows) return [];

  // Dedupe by slug, keeping the newest-modified row (rows are already
  // sorted desc, so the first occurrence of each slug wins).
  const winners: typeof rows = [];
  const seenSlug = new Set<string>();
  for (const r of rows) {
    const slug = slugFromUrl(r.url);
    if (!slug || seenSlug.has(slug)) continue;
    seenSlug.add(slug);
    winners.push(r);
  }

  const v2Ids = winners.filter((r) => r.source_site === "v2").map((r) => r.id);
  const v1Ids = winners.filter((r) => r.source_site === "v1").map((r) => r.id);
  const ids = winners.map((r) => r.id);

  // Featured images: v2 via media_items(wp_id), v1 via seo_meta.og_image.
  const v2MediaMap = new Map<number, string>();
  const v2MediaIds = [
    ...new Set(
      winners
        .filter((r) => r.source_site === "v2")
        .map((r) => r.featured_media_wp_id)
        .filter(Boolean) as number[],
    ),
  ];
  if (v2MediaIds.length > 0) {
    const { data: media } = await sb
      .from("media_items")
      .select("wp_id, storage_url")
      .eq("source_site", "v2")
      .in("wp_id", v2MediaIds);
    for (const m of media ?? []) if (m.storage_url) v2MediaMap.set(m.wp_id, m.storage_url);
  }
  const v1OgMap = new Map<string, string>();
  if (v1Ids.length > 0) {
    const { data: seo } = await sb
      .from("seo_meta")
      .select("url_inventory_id, og_image")
      .in("url_inventory_id", v1Ids);
    for (const s of seo ?? []) if (s.og_image) v1OgMap.set(s.url_inventory_id, s.og_image);
  }

  // Excerpts (one query covers both sources).
  const excerptMap = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data: ci } = await sb
      .from("content_items")
      .select("url_inventory_id, excerpt_rendered, content_rendered")
      .in("url_inventory_id", ids.slice(i, i + 100));
    for (const c of ci ?? []) {
      excerptMap.set(c.url_inventory_id, c.excerpt_rendered || c.content_rendered || "");
    }
  }

  // Taxonomy (event_category) — only populated for v2; v1 cards show none.
  const taxMap = new Map<string, string>();
  if (v2Ids.length > 0) {
    for (let i = 0; i < v2Ids.length; i += 100) {
      const { data: pt } = await sb
        .from("post_terms")
        .select("url_inventory_id, taxonomy_terms(taxonomy, name)")
        .in("url_inventory_id", v2Ids.slice(i, i + 100));
      for (const p of (pt ?? []) as TermJoin[]) {
        const t = Array.isArray(p.taxonomy_terms) ? p.taxonomy_terms[0] : p.taxonomy_terms;
        if (t?.taxonomy === "event_category" && !taxMap.has(p.url_inventory_id)) {
          taxMap.set(p.url_inventory_id, t.name);
        }
      }
    }
  }

  return winners.map((r) => ({
    id: r.id,
    slug: slugFromUrl(r.url),
    title: decodeEntities(r.title ?? ""),
    excerpt: cleanExcerpt(excerptMap.get(r.id) || null),
    date_published: r.date_published,
    date_modified: r.date_modified,
    featured_image_url:
      r.source_site === "v2"
        ? r.featured_media_wp_id
          ? v2MediaMap.get(r.featured_media_wp_id) ?? null
          : null
        : v1OgMap.get(r.id) ?? null,
    category: taxMap.get(r.id) ?? null,
  }));
}

/** Detailed view for a single retreat by slug.
 *
 * Newest-wins across sites: a slug can resolve to a v1 (production) and a
 * v2 (staging) row; we serve whichever was modified most recently. The v2
 * branch maps Elementor media via media_items; the v1 branch reads the
 * body that populate-v1-retreats.ts stored with Supabase Storage URLs
 * already baked in (so no media mapping needed) and the hero from
 * seo_meta.og_image. */
export async function getRetreatBySlug(slug: string): Promise<RetreatDetail | null> {
  const sb = supabaseServerOrNull();
  if (!sb) return null;

  // Match on url ending `/retreat/{slug}/` across BOTH sites, newest
  // modified first — first row is the winner.
  const { data: rows } = await sb
    .from("url_inventory")
    .select("id, url, title, wp_id, date_published, date_modified, featured_media_wp_id, author_id, source_site")
    .in("source_site", ["v1", "v2"])
    .eq("post_type", "retreat")
    .ilike("url", `%/retreat/${slug}/%`)
    .order("date_modified", { ascending: false, nullsFirst: false })
    .limit(2);
  const row = rows?.[0];
  if (!row) return null;
  const isV1 = row.source_site === "v1";

  const [{ data: ci }, featuredMedia, author, termRows, seoMeta] = await Promise.all([
    sb
      .from("content_items")
      .select("content_rendered, excerpt_rendered, scraped_body_html")
      .eq("url_inventory_id", row.id)
      .maybeSingle(),
    !isV1 && row.featured_media_wp_id
      ? sb
          .from("media_items")
          .select("storage_url")
          .eq("source_site", "v2")
          .eq("wp_id", row.featured_media_wp_id)
          .maybeSingle()
          .then((r) => r.data?.storage_url ?? null)
      : Promise.resolve(null),
    row.author_id
      ? sb
          .from("authors")
          .select("display_name, slug, avatar_url")
          .eq("id", row.author_id)
          .maybeSingle()
          .then((r) => r.data ?? null)
      : Promise.resolve(null),
    sb
      .from("post_terms")
      .select("taxonomy_terms(taxonomy, name, slug)")
      .eq("url_inventory_id", row.id)
      .then((r) => r.data ?? []),
    sb
      .from("seo_meta")
      .select("meta_title, meta_description, og_image, canonical_url")
      .eq("url_inventory_id", row.id)
      .maybeSingle()
      .then((r) => r.data ?? null),
  ]);

  // Prefer the full scraped body (Elementor Theme Builder renders extra
  // sections that WP REST doesn't expose). Fall back to content_rendered.
  const ciBody = ci as ContentBody | null;
  const rawBody = ciBody?.scraped_body_html || ciBody?.content_rendered || "";

  // v2: resolve WP media URLs in the body to Storage via media_items.
  // v1: the body already carries Storage URLs (capture rewrote them), so
  // the mediaMap stays empty and rewriteHtml only normalises WP host links.
  const mediaMap = new Map<string, string>();
  if (!isV1) {
    const candidates = candidateBaseUrls(rawBody, WP_HOSTS);
    if (candidates.length > 0) {
      for (let i = 0; i < candidates.length; i += 500) {
        const { data: found } = await sb
          .from("media_items")
          .select("source_url, storage_url")
          .eq("source_site", "v2")
          .in("source_url", candidates.slice(i, i + 500));
        for (const m of found ?? []) {
          if (m.storage_url) mediaMap.set(m.source_url, m.storage_url);
        }
      }
    }
  }
  const body_html = rewriteHtml(rawBody, { sourceHosts: WP_HOSTS, mediaMap });

  const category =
    ((termRows ?? []) as TermOnly[])
      .map((p) => (Array.isArray(p.taxonomy_terms) ? p.taxonomy_terms[0] : p.taxonomy_terms))
      .filter((t): t is TermNode => t?.taxonomy === "event_category")
      .map((t) => t.name)[0] ?? null;

  // Featured hero: v2 from media_items, v1 from seo_meta.og_image.
  const featured_image_url = isV1 ? seoMeta?.og_image ?? null : featuredMedia;

  return {
    id: row.id,
    slug,
    title: decodeEntities(row.title ?? ""),
    excerpt: cleanExcerpt(ci?.excerpt_rendered ?? null),
    date_published: row.date_published,
    date_modified: row.date_modified,
    featured_image_url,
    category,
    wp_id: row.wp_id ?? 0,
    body_html,
    author,
    seo: seoMeta
      ? {
          title: seoMeta.meta_title,
          description: seoMeta.meta_description,
          og_image: seoMeta.og_image,
          canonical: seoMeta.canonical_url,
        }
      : null,
  };
}
