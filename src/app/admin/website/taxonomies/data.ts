import "server-only";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import { decodeEntities } from "@/lib/website-builder/decode";

// Staging source. v2 is the live/newest WP mirror the builder surfaces.
const SOURCE_SITE = "v2";

export type TaxonomyManagerTerm = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  taxonomy: "category" | "post_tag";
  /** LIVE count: distinct published v2 posts linked to this term. */
  count: number;
};

/**
 * Load BOTH taxonomies (categories + tags) with LIVE published-post counts.
 *
 * Counts come from post_terms joined against the set of published v2 posts —
 * NOT from taxonomy_terms.post_count, which the WP import leaves stale.
 * Returns null when Supabase env vars are missing (so the page can show a
 * "not configured" note instead of crashing).
 */
export async function getTaxonomyManagerData(): Promise<
  TaxonomyManagerTerm[] | null
> {
  const sb = supabaseServerOrNull();
  if (!sb) return null;

  // 1) Every category/tag term on the v2 source.
  const { data: termRows } = await sb
    .from("taxonomy_terms")
    .select("id, name, slug, description, taxonomy")
    .eq("source_site", SOURCE_SITE)
    .in("taxonomy", ["category", "post_tag"]);
  const terms = (termRows ?? []) as unknown as Array<{
    id: string;
    name: string | null;
    slug: string | null;
    description: string | null;
    taxonomy: "category" | "post_tag";
  }>;
  if (terms.length === 0) return [];

  // 2) The set of published v2 post ids (this filters out v1 ids / drafts).
  const { data: postRows } = await sb
    .from("url_inventory")
    .select("id")
    .eq("source_site", SOURCE_SITE)
    .eq("post_type", "post")
    .eq("wp_status", "publish");
  const publishedIds = new Set(
    ((postRows ?? []) as { id: string }[]).map((r) => r.id),
  );

  // 3) Post <-> term links, then count DISTINCT published posts per term.
  const counts = new Map<string, Set<string>>();
  if (publishedIds.size > 0) {
    const { data: linkRows } = await sb
      .from("post_terms")
      .select("taxonomy_term_id, url_inventory_id")
      .in("taxonomy_term_id", terms.map((t) => t.id));
    for (const l of (linkRows ?? []) as {
      taxonomy_term_id: string | null;
      url_inventory_id: string | null;
    }[]) {
      if (!l.taxonomy_term_id || !l.url_inventory_id) continue;
      if (!publishedIds.has(l.url_inventory_id)) continue;
      let set = counts.get(l.taxonomy_term_id);
      if (!set) {
        set = new Set<string>();
        counts.set(l.taxonomy_term_id, set);
      }
      set.add(l.url_inventory_id);
    }
  }

  const result: TaxonomyManagerTerm[] = terms.map((t) => ({
    id: t.id,
    name: decodeEntities(t.name ?? ""),
    slug: t.slug,
    description: t.description,
    taxonomy: t.taxonomy,
    count: counts.get(t.id)?.size ?? 0,
  }));

  // Sort by count desc, then name asc.
  result.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });

  return result;
}
