import "server-only";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import { decodeEntities } from "@/lib/website-builder/decode";
import {
  firstBodyImage,
  resolveBodyImageMirrors,
} from "@/lib/website-builder/first-body-image";
import { stripHtmlToWords, readMinutes } from "./helpers";

// Staging source. v2 is the live/newest WP mirror the builder surfaces —
// same source the /category/[slug] listing reads from.
const SOURCE_SITE = "v2";

export type BlogPost = {
  id: string;
  title: string;
  url_path: string;
  date_published: string | null;
  author: string | null;
  excerpt: string;
  image_url: string | null;
  image_alt: string | null;
  read_minutes: number;
  category: string | null; // primary category label shown on the card
};

export type BlogCategory = {
  name: string;
  slug: string;
  count: number;
};

export type BlogIndexData = {
  posts: BlogPost[];
  categories: BlogCategory[];
  total: number;
};

/**
 * Load every published post (newest first) plus the category list with
 * per-category counts for the "Browse by" sidebar.
 *
 * Deliberately LOCAL to this route (a few small queries stitched in JS),
 * mirroring src/app/(site)/category/[slug]/data.ts rather than editing the
 * shared queries. Returns null when Supabase env is missing.
 */
export async function getBlogIndexData(): Promise<BlogIndexData | null> {
  const sb = supabaseServerOrNull();
  if (!sb) return null;

  // 1) All published posts.
  const { data: rowsRaw } = await sb
    .from("url_inventory")
    .select(
      "id, title, url_path, date_published, excerpt, author_id, featured_media_wp_id",
    )
    .eq("source_site", SOURCE_SITE)
    .eq("post_type", "post")
    .eq("wp_status", "publish")
    .order("date_published", { ascending: false, nullsFirst: false });
  const rows = (rowsRaw ?? []) as unknown as Array<{
    id: string;
    title: string | null;
    url_path: string | null;
    date_published: string | null;
    excerpt: string | null;
    author_id: string | null;
    featured_media_wp_id: number | null;
  }>;

  const total = rows.length;
  const emptyResult: BlogIndexData = { posts: [], categories: [], total: 0 };
  if (rows.length === 0) return emptyResult;

  const postIds = rows.map((r) => r.id);

  // 2) Authors, media, body content, category terms + links — batched.
  const authorIds = [
    ...new Set(rows.map((r) => r.author_id).filter((x): x is string => !!x)),
  ];
  const mediaWpIds = [
    ...new Set(
      rows
        .map((r) => r.featured_media_wp_id)
        .filter((x): x is number => x != null),
    ),
  ];

  const [authorsRes, mediaRes, contentRes, termsRes, linksRes] =
    await Promise.all([
      authorIds.length
        ? sb.from("authors").select("id, display_name").in("id", authorIds)
        : Promise.resolve({ data: [] as unknown[] }),
      mediaWpIds.length
        ? sb
            .from("media_items")
            .select("wp_id, storage_url, source_url, alt_text")
            .eq("source_site", SOURCE_SITE)
            .in("wp_id", mediaWpIds)
        : Promise.resolve({ data: [] as unknown[] }),
      sb
        .from("content_items")
        .select("url_inventory_id, content_rendered")
        .in("url_inventory_id", postIds),
      sb
        .from("taxonomy_terms")
        .select("id, name, slug")
        .eq("taxonomy", "category")
        .eq("source_site", SOURCE_SITE),
      sb
        .from("post_terms")
        .select("url_inventory_id, taxonomy_term_id")
        .in("url_inventory_id", postIds),
    ]);

  const authorMap = new Map<string, string>();
  for (const a of (authorsRes.data ?? []) as {
    id: string;
    display_name: string | null;
  }[]) {
    authorMap.set(a.id, decodeEntities(a.display_name ?? ""));
  }

  const mediaMap = new Map<number, { url: string | null; alt: string | null }>();
  for (const m of (mediaRes.data ?? []) as {
    wp_id: number;
    storage_url: string | null;
    source_url: string | null;
    alt_text: string | null;
  }[]) {
    mediaMap.set(m.wp_id, {
      url: m.storage_url ?? m.source_url ?? null,
      alt: m.alt_text ?? null,
    });
  }

  const contentMap = new Map<string, string | null>();
  for (const c of (contentRes.data ?? []) as {
    url_inventory_id: string;
    content_rendered: string | null;
  }[]) {
    contentMap.set(c.url_inventory_id, c.content_rendered ?? null);
  }

  // Category term metadata (id → name/slug), used both for the per-post
  // label below and the sidebar counts further down.
  const termMeta = new Map<string, { name: string; slug: string }>();
  for (const t of (termsRes.data ?? []) as {
    id: string;
    name: string | null;
    slug: string | null;
  }[]) {
    if (t.slug) termMeta.set(t.id, { name: decodeEntities(t.name ?? ""), slug: t.slug });
  }

  // First category each post links to → its card label.
  const links = (linksRes.data ?? []) as {
    url_inventory_id: string;
    taxonomy_term_id: string;
  }[];
  const primaryCatByPost = new Map<string, string>();
  for (const l of links) {
    if (!primaryCatByPost.has(l.url_inventory_id)) {
      const meta = termMeta.get(l.taxonomy_term_id);
      if (meta) primaryCatByPost.set(l.url_inventory_id, meta.name);
    }
  }

  // Posts with no featured image: fall back to the first body photo, but
  // resolved to a WORKING Supabase mirror URL — raw WP body URLs 404 on
  // staging. Unresolved posts keep the colour tile (never a broken image).
  const fallbackCandidates: { id: string; url: string }[] = [];
  for (const r of rows) {
    const hasFeatured =
      r.featured_media_wp_id != null &&
      !!mediaMap.get(r.featured_media_wp_id)?.url;
    if (hasFeatured) continue;
    const u = firstBodyImage(contentMap.get(r.id) ?? null);
    if (u) fallbackCandidates.push({ id: r.id, url: u });
  }
  const bodyMirror = await resolveBodyImageMirrors(
    sb,
    fallbackCandidates,
    SOURCE_SITE,
  );

  const posts: BlogPost[] = rows.map((r) => {
    const media =
      r.featured_media_wp_id != null
        ? mediaMap.get(r.featured_media_wp_id)
        : undefined;
    const body = contentMap.get(r.id) ?? null;
    const excerpt =
      (r.excerpt && r.excerpt.trim()
        ? stripHtmlToWords(r.excerpt, 26)
        : stripHtmlToWords(body, 26)) || "";
    return {
      id: r.id,
      title: decodeEntities(r.title ?? "(untitled)"),
      url_path: r.url_path ?? "",
      date_published: r.date_published,
      author: r.author_id ? authorMap.get(r.author_id) ?? null : null,
      excerpt,
      image_url: media?.url ?? bodyMirror.get(r.id) ?? null,
      image_alt: media?.alt ?? null,
      read_minutes: readMinutes(body),
      category: primaryCatByPost.get(r.id) ?? null,
    };
  });

  // 3) Category counts — how many published posts link to each term.
  const countByTerm = new Map<string, number>();
  for (const l of links) {
    if (termMeta.has(l.taxonomy_term_id)) {
      countByTerm.set(
        l.taxonomy_term_id,
        (countByTerm.get(l.taxonomy_term_id) ?? 0) + 1,
      );
    }
  }
  const categories: BlogCategory[] = [...termMeta.entries()]
    .map(([id, meta]) => ({
      name: meta.name,
      slug: meta.slug,
      count: countByTerm.get(id) ?? 0,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return { posts, categories, total };
}
