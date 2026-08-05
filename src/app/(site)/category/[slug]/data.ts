import "server-only";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import { decodeEntities } from "@/lib/website-builder/decode";
import { firstBodyImage } from "@/lib/website-builder/first-body-image";
import { stripHtmlToWords, readMinutes } from "./helpers";

// Staging source. v2 is the live/newest WP mirror the builder surfaces.
const SOURCE_SITE = "v2";

export type CategoryTerm = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type CategoryPost = {
  id: string;
  title: string;
  url_path: string;
  date_published: string | null;
  author: string | null;
  excerpt: string;
  image_url: string | null;
  image_alt: string | null;
  read_minutes: number;
};

export type CategoryData = {
  term: CategoryTerm;
  posts: CategoryPost[];
};

/**
 * Load a category term + all its published posts, newest first.
 * Returns `null` when the term doesn't exist (caller should notFound()).
 * A term that exists but has no live posts returns an empty `posts[]`.
 *
 * Query is deliberately kept LOCAL to this route (a few small queries
 * stitched in JS) rather than editing the shared queries.ts.
 */
export async function getCategoryData(
  slug: string,
): Promise<CategoryData | null> {
  const sb = supabaseServerOrNull();
  if (!sb) return null;

  // 1) The category term. Use "fetch all + take first" (NOT .maybeSingle):
  //    the WP import can leave more than one taxonomy_terms row per slug
  //    (duplicate terms, often with the posts linked to only one copy).
  //    .maybeSingle() ERRORS on >1 row -> data null -> a silent 404 on
  //    every such category. Collect every matching row so we survive the
  //    duplicates AND can look up posts across all of the term's ids.
  const { data: termRows } = await sb
    .from("taxonomy_terms")
    .select("id, name, slug, description")
    .eq("taxonomy", "category")
    .eq("source_site", SOURCE_SITE)
    .eq("slug", slug);
  const terms = (termRows ?? []) as unknown as Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
  }>;
  if (terms.length === 0) return null;
  const term = terms[0];
  const termIds = terms.map((t) => t.id);

  // 2) Which posts are linked to this term (across any duplicate id).
  const { data: linksRaw } = await sb
    .from("post_terms")
    .select("url_inventory_id")
    .in("taxonomy_term_id", termIds);
  const postIds = [
    ...new Set(
      ((linksRaw ?? []) as { url_inventory_id: string }[])
        .map((r) => r.url_inventory_id)
        .filter(Boolean),
    ),
  ];

  const emptyResult: CategoryData = {
    term: {
      id: term.id,
      name: decodeEntities(term.name ?? ""),
      slug: term.slug,
      description: term.description ?? null,
    },
    posts: [],
  };
  if (postIds.length === 0) return emptyResult;

  // 3) The published post rows themselves.
  const { data: rowsRaw } = await sb
    .from("url_inventory")
    .select(
      "id, title, url_path, date_published, excerpt, author_id, featured_media_wp_id",
    )
    .in("id", postIds)
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
  if (rows.length === 0) return emptyResult;

  // 4) Authors, media, and body content — batched lookups, stitched in JS.
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
  const rowIds = rows.map((r) => r.id);

  const [authorsRes, mediaRes, contentRes] = await Promise.all([
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
      .in("url_inventory_id", rowIds),
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

  const posts: CategoryPost[] = rows.map((r) => {
    const media =
      r.featured_media_wp_id != null
        ? mediaMap.get(r.featured_media_wp_id)
        : undefined;
    const body = contentMap.get(r.id) ?? null;
    const excerpt =
      (r.excerpt && r.excerpt.trim()
        ? stripHtmlToWords(r.excerpt, 30)
        : stripHtmlToWords(body, 30)) || "";
    return {
      id: r.id,
      title: decodeEntities(r.title ?? "(untitled)"),
      url_path: r.url_path ?? "",
      date_published: r.date_published,
      author: r.author_id ? authorMap.get(r.author_id) ?? null : null,
      excerpt,
      // Fall back to the first photo in the article body when no featured
      // image is set, so photo-rich posts never show an empty colour tile.
      image_url: media?.url ?? firstBodyImage(body) ?? null,
      image_alt: media?.alt ?? null,
      read_minutes: readMinutes(body),
    };
  });

  return {
    term: {
      id: term.id,
      name: decodeEntities(term.name ?? ""),
      slug: term.slug,
      description: term.description ?? null,
    },
    posts,
  };
}
