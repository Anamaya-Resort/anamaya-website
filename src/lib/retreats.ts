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

/** List all published retreats, newest-modified first. */
export async function listRetreats(): Promise<RetreatCard[]> {
  const sb = supabaseServerOrNull();
  if (!sb) return [];

  const { data: rows, error } = await sb
    .from("url_inventory")
    .select("id, url, title, wp_id, date_published, date_modified, featured_media_wp_id")
    .eq("source_site", "v2")
    .eq("post_type", "retreat")
    .not("title", "is", null)
    .not("wp_id", "is", null)
    // exclude the archive URL itself
    .neq("url", "https://anamayastg.wpenginepowered.com/retreats/")
    .order("date_modified", { ascending: false })
    .limit(200);
  if (error || !rows) return [];

  // Resolve featured images in one join
  const mediaIds = [...new Set(rows.map((r) => r.featured_media_wp_id).filter(Boolean) as number[])];
  const mediaMap = new Map<number, string>();
  if (mediaIds.length > 0) {
    const { data: media } = await sb
      .from("media_items")
      .select("wp_id, storage_url")
      .eq("source_site", "v2")
      .in("wp_id", mediaIds);
    for (const m of media ?? []) if (m.storage_url) mediaMap.set(m.wp_id, m.storage_url);
  }

  // Excerpts in one call
  const ids = rows.map((r) => r.id);
  const excerptMap = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data: ci } = await sb
      .from("content_items")
      .select("url_inventory_id, excerpt_rendered, content_rendered")
      .in("url_inventory_id", ids.slice(i, i + 100));
    for (const c of ci ?? []) {
      excerptMap.set(
        c.url_inventory_id,
        c.excerpt_rendered || c.content_rendered || "",
      );
    }
  }

  // Taxonomy (show the event_category name on cards)
  const taxMap = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data: pt } = await sb
      .from("post_terms")
      .select("url_inventory_id, taxonomy_terms(taxonomy, name)")
      .in("url_inventory_id", ids.slice(i, i + 100));
    for (const p of pt ?? []) {
      const t: any = (p as any).taxonomy_terms;
      if (t?.taxonomy === "event_category" && !taxMap.has(p.url_inventory_id)) {
        taxMap.set(p.url_inventory_id, t.name);
      }
    }
  }

  return rows.map((r) => ({
    id: r.id,
    slug: slugFromUrl(r.url),
    title: decodeEntities(r.title ?? ""),
    excerpt: cleanExcerpt(excerptMap.get(r.id) || null),
    date_published: r.date_published,
    date_modified: r.date_modified,
    featured_image_url: r.featured_media_wp_id ? mediaMap.get(r.featured_media_wp_id) ?? null : null,
    category: taxMap.get(r.id) ?? null,
  }));
}

/** Detailed view for a single retreat by slug. */
export async function getRetreatBySlug(slug: string): Promise<RetreatDetail | null> {
  const sb = supabaseServerOrNull();
  if (!sb) return null;

  // Match on url ending `/retreat/{slug}/` — v2 always has a trailing slash.
  const { data: rows } = await sb
    .from("url_inventory")
    .select("id, url, title, wp_id, date_published, date_modified, featured_media_wp_id, author_id")
    .eq("source_site", "v2")
    .eq("post_type", "retreat")
    .ilike("url", `%/retreat/${slug}/%`)
    .limit(1);
  const row = rows?.[0];
  if (!row || !row.wp_id) return null;

  const [{ data: ci }, featuredMedia, author, termRows, seoMeta] = await Promise.all([
    sb
      .from("content_items")
      .select("content_rendered, excerpt_rendered, scraped_body_html")
      .eq("url_inventory_id", row.id)
      .maybeSingle(),
    row.featured_media_wp_id
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
  // sections that WP REST doesn't expose). Fall back to content_rendered
  // if we haven't scraped this retreat yet.
  const rawBody =
    ((ci as any)?.scraped_body_html as string | null) ||
    ci?.content_rendered ||
    "";

  // Rewrite body HTML: swap WP media URLs to Supabase Storage and strip WP hosts.
  // Candidates include both exact URLs and base URLs (with WP's -WxH size
  // variant stripped) so rewrites still resolve for thumbnails like -300x300.webp.
  const candidates = candidateBaseUrls(rawBody, WP_HOSTS);
  const mediaMap = new Map<string, string>();
  if (candidates.length > 0) {
    // Chunk the IN query — Supabase can handle ~1k entries but we have lots of media.
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
  const body_html = rewriteHtml(rawBody, { sourceHosts: WP_HOSTS, mediaMap });

  const category =
    ((termRows as any[]) ?? [])
      .map((t) => t.taxonomy_terms)
      .filter((t) => t?.taxonomy === "event_category")
      .map((t) => t.name)[0] ?? null;

  return {
    id: row.id,
    slug,
    title: decodeEntities(row.title ?? ""),
    excerpt: cleanExcerpt(ci?.excerpt_rendered ?? null),
    date_published: row.date_published,
    date_modified: row.date_modified,
    featured_image_url: featuredMedia,
    category,
    wp_id: row.wp_id,
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
