import "server-only";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import { decodeEntities } from "@/lib/website-builder/decode";
import {
  firstBodyImage,
  resolveBodyImageMirrors,
} from "@/lib/website-builder/first-body-image";

// Staging source. v2 is the live/newest WP mirror the builder surfaces.
// (Mirrors tags/data.ts — we count only published v2 posts, but we UNION
//  duplicate v1/v2 terms by slug so a category that only carries its posts
//  on one copy of the term still shows every story.)
const SOURCE_SITE = "v2";

export type CatInfo = {
  name: string;
  slug: string;
  count: number;
};

export type CatPost = {
  id: string;
  title: string;
  url_path: string;
  author: string | null;
  date_published: string | null;
  image_url: string | null;
};

export type CategoriesData = {
  cats: CatInfo[];
  postsByCat: Record<string, CatPost[]>;
  totalCategorizedPosts: number;
};

/**
 * Load every `category` term that has >=1 published v2 post, plus the posts
 * grouped under each category (newest first).
 *
 * Query is kept LOCAL to this route (a handful of small queries stitched in
 * JS) rather than editing the shared queries.ts, matching the tags route.
 */
export async function getCategoriesData(): Promise<CategoriesData> {
  const empty: CategoriesData = { cats: [], postsByCat: {}, totalCategorizedPosts: 0 };
  const sb = supabaseServerOrNull();
  if (!sb) return empty;

  // 1) Every category term (across BOTH source sites so we can union v1/v2
  //    duplicates by slug). The WP import can leave more than one
  //    taxonomy_terms row per slug; we collect every id per slug so a
  //    category whose posts hang off only one copy of the term still resolves.
  const { data: termRows } = await sb
    .from("taxonomy_terms")
    .select("id, name, slug, source_site")
    .eq("taxonomy", "category");
  const terms = (termRows ?? []) as unknown as Array<{
    id: string;
    name: string | null;
    slug: string | null;
    source_site: string | null;
  }>;
  if (terms.length === 0) return empty;

  // slug -> { name, termIds[] }. Prefer a v2 term's name; else any name.
  type SlugAgg = { name: string; hasV2Name: boolean; termIds: string[] };
  const bySlug = new Map<string, SlugAgg>();
  const slugByTermId = new Map<string, string>();
  for (const t of terms) {
    if (!t.slug || !t.id) continue;
    slugByTermId.set(t.id, t.slug);
    const name = decodeEntities(t.name ?? "");
    const isV2 = t.source_site === SOURCE_SITE;
    const agg = bySlug.get(t.slug);
    if (agg) {
      agg.termIds.push(t.id);
      if (!agg.hasV2Name && (isV2 || (!agg.name && name))) {
        agg.name = name || agg.name;
        agg.hasV2Name = isV2 && !!name;
      }
    } else {
      bySlug.set(t.slug, {
        name,
        hasV2Name: isV2 && !!name,
        termIds: [t.id],
      });
    }
  }

  const allTermIds = [...slugByTermId.keys()];
  if (allTermIds.length === 0) return empty;

  // 2) Post <-> term links (across every duplicate term id).
  const { data: linksRaw } = await sb
    .from("post_terms")
    .select("url_inventory_id, taxonomy_term_id")
    .in("taxonomy_term_id", allTermIds);
  const links = ((linksRaw ?? []) as {
    url_inventory_id: string | null;
    taxonomy_term_id: string | null;
  }[]).filter((l) => l.url_inventory_id && l.taxonomy_term_id);

  const allPostIds = [
    ...new Set(links.map((l) => l.url_inventory_id as string)),
  ];
  if (allPostIds.length === 0) return empty;

  // 3) The published v2 post rows themselves (this is what filters out v1
  //    ids / drafts — only these count toward a category).
  const { data: rowsRaw } = await sb
    .from("url_inventory")
    .select(
      "id, title, url_path, date_published, author_id, featured_media_wp_id",
    )
    .in("id", allPostIds)
    .eq("source_site", SOURCE_SITE)
    .eq("post_type", "post")
    .eq("wp_status", "publish")
    .order("date_published", { ascending: false, nullsFirst: false });
  const rows = (rowsRaw ?? []) as unknown as Array<{
    id: string;
    title: string | null;
    url_path: string | null;
    date_published: string | null;
    author_id: string | null;
    featured_media_wp_id: number | null;
  }>;
  if (rows.length === 0) return empty;

  const validPostIds = new Set(rows.map((r) => r.id));

  // 4) Authors, media, body content — batched, stitched in JS (same as the
  //    tags route). Used to resolve the thumbnail mirror image.
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
          .select("wp_id, storage_url, source_url")
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

  const mediaMap = new Map<number, string | null>();
  for (const m of (mediaRes.data ?? []) as {
    wp_id: number;
    storage_url: string | null;
    source_url: string | null;
  }[]) {
    mediaMap.set(m.wp_id, m.storage_url ?? m.source_url ?? null);
  }

  const contentMap = new Map<string, string | null>();
  for (const c of (contentRes.data ?? []) as {
    url_inventory_id: string;
    content_rendered: string | null;
  }[]) {
    contentMap.set(c.url_inventory_id, c.content_rendered ?? null);
  }

  // Posts with no featured image: fall back to the first body photo,
  // resolved to a WORKING Supabase mirror (raw WP body URLs 404 on staging).
  const fallbackCandidates: { id: string; url: string }[] = [];
  for (const r of rows) {
    const hasFeatured =
      r.featured_media_wp_id != null && !!mediaMap.get(r.featured_media_wp_id);
    if (hasFeatured) continue;
    const u = firstBodyImage(contentMap.get(r.id) ?? null);
    if (u) fallbackCandidates.push({ id: r.id, url: u });
  }
  const bodyMirror = await resolveBodyImageMirrors(
    sb,
    fallbackCandidates,
    SOURCE_SITE,
  );

  // Assemble the reusable CatPost per row.
  const postById = new Map<string, CatPost>();
  for (const r of rows) {
    const media =
      r.featured_media_wp_id != null
        ? mediaMap.get(r.featured_media_wp_id) ?? null
        : null;
    postById.set(r.id, {
      id: r.id,
      title: decodeEntities(r.title ?? "(untitled)"),
      url_path: r.url_path ?? "",
      author: r.author_id ? authorMap.get(r.author_id) ?? null : null,
      date_published: r.date_published,
      image_url: media ?? bodyMirror.get(r.id) ?? null,
    });
  }

  // 5) Group posts under each category slug (dedup per slug; newest first via
  //    the ordered `rows` query preserving order below).
  const postIdsBySlug = new Map<string, Set<string>>();
  for (const l of links) {
    const pid = l.url_inventory_id as string;
    if (!validPostIds.has(pid)) continue;
    const slug = slugByTermId.get(l.taxonomy_term_id as string);
    if (!slug) continue;
    let set = postIdsBySlug.get(slug);
    if (!set) {
      set = new Set<string>();
      postIdsBySlug.set(slug, set);
    }
    set.add(pid);
  }

  // rows is already newest-first; use it to order each category's list.
  const orderedRowIds = rows.map((r) => r.id);

  const cats: CatInfo[] = [];
  const postsByCat: Record<string, CatPost[]> = {};
  for (const [slug, agg] of bySlug) {
    const set = postIdsBySlug.get(slug);
    if (!set || set.size === 0) continue;
    const list: CatPost[] = [];
    for (const id of orderedRowIds) {
      if (set.has(id)) {
        const p = postById.get(id);
        if (p) list.push(p);
      }
    }
    if (list.length === 0) continue;
    cats.push({ name: agg.name || slug, slug, count: list.length });
    postsByCat[slug] = list;
  }

  const categorizedPostIds = new Set<string>();
  for (const set of postIdsBySlug.values()) {
    for (const id of set) categorizedPostIds.add(id);
  }

  return { cats, postsByCat, totalCategorizedPosts: categorizedPostIds.size };
}
