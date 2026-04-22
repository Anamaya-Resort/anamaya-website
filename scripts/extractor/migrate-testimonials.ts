// Populate `testimonials` + `testimonial_set_items` from v2's guest_testimonials
// content already extracted into content_items.
//
// v2 testimonials store their quote inside content_rendered with an embedded
// headline in the format:
//   Testimonial: "Headline..."
//   "The actual quote..."
//
// We parse that out, split author/source/date from the post title
// ("Guest Review by {author}, {source}, {date}"), and map each testimonial's
// category_testimonials terms to our own testimonial_sets via a slug map.

import { sb } from "./lib";

// Map v2 category_testimonials term slugs to our CMS set slugs.
// Unmapped terms are ignored (kept on source in case we want to later).
const CATEGORY_TO_SET: Record<string, string[]> = {
  // Broad buckets — v2 liberally tags testimonials; we map them to pages.
  "yoga-retreat":          ["retreats", "homepage"],
  "retreat_testimonial":   ["retreats", "homepage"],
  "general_testimonial":   ["homepage"],
  "property_testimonial":  ["homepage"],
  "ytt_testimonial":       ["ytt"],
  "200-hr":                ["ytt"],
  "cuisine_testimonial":   ["cuisine", "homepage"],
  "spa_testimonial":       ["wellness"],
  "massage":               ["wellness"],
  "wellness":              ["wellness"],
  "surfing":               ["surfing"],
  "adventure":             ["homepage"],
  "experience":            ["homepage"],
};

type TestimonialRow = {
  id?: string;
  author: string;
  source: string | null;
  source_date: string | null;
  rating: number;
  headline: string | null;
  quote: string;
  wp_id: number;
  published: boolean;
};

// Title parsing: "Guest Review by {author}, {source}, {date}"
// Also handles "YTT Graduate" etc. where author is inferred differently.
function parseTitle(title: string): { author: string; source: string | null; source_date: string | null } {
  const t = title.trim();
  const m = t.match(/^Guest Review by\s+(.+?)(?:,\s*(Trip Advisor|TripAdvisor|Google|[A-Z][a-zA-Z]+))?(?:,\s*(.+))?$/);
  if (m) {
    return {
      author: m[1].trim(),
      source: m[2] ? (m[2].replace(/\s+/g, "") === "TripAdvisor" ? "TripAdvisor" : m[2]) : null,
      source_date: m[3]?.trim() || null,
    };
  }
  // Fallbacks like "YTT Graduate"
  return { author: t, source: null, source_date: null };
}

// Content parsing: extract the "Testimonial: 'Headline...'" line and the quote
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

function parseBody(content: string): { headline: string | null; quote: string } {
  const plain = decodeEntities(content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  // Look for Testimonial: "..."
  const headlineMatch = plain.match(/Testimonial:\s*["“](.+?)["”]/);
  let headline: string | null = null;
  let remainder = plain;
  if (headlineMatch) {
    headline = headlineMatch[1].replace(/\.{2,}$/, "").trim();
    remainder = plain.slice(headlineMatch[0].length).trim();
  }
  // The quote usually follows in quotes; strip outer quote marks if present
  const quoteMatch = remainder.match(/["“](.+?)["”]\s*$/s);
  const quote = (quoteMatch ? quoteMatch[1] : remainder).trim();
  return { headline, quote };
}

async function main() {
  const client = sb();
  console.log("→ loading v2 guest_testimonials rows from url_inventory");

  const { data: rows, error } = await client
    .from("url_inventory")
    .select("id, wp_id, title, url")
    .eq("source_site", "v2")
    .eq("post_type", "guest_testimonials")
    .not("wp_id", "is", null)
    .not("title", "is", null)
    .neq("url", "https://anamayastg.wpenginepowered.com/guest_testimonials/");
  if (error) throw error;
  console.log(`→ ${rows?.length ?? 0} candidate testimonials`);

  const toUpsert: TestimonialRow[] = [];
  const categoriesByWpId = new Map<number, string[]>();

  for (const r of rows ?? []) {
    const { data: ci } = await client
      .from("content_items")
      .select("content_rendered, excerpt_rendered")
      .eq("url_inventory_id", r.id)
      .maybeSingle();
    const body = (ci?.content_rendered ?? "") || (ci?.excerpt_rendered ?? "");
    if (!body) continue;

    const { author, source, source_date } = parseTitle(r.title ?? "");
    const { headline, quote } = parseBody(body);
    if (!quote) continue;

    const { data: pt } = await client
      .from("post_terms")
      .select("taxonomy_terms(taxonomy, slug)")
      .eq("url_inventory_id", r.id);
    const catSlugs = (pt ?? [])
      .map((p: any) => p.taxonomy_terms)
      .filter((t: any) => t?.taxonomy === "category_testimonials")
      .map((t: any) => t.slug as string);
    categoriesByWpId.set(r.wp_id, catSlugs);

    toUpsert.push({
      author,
      source,
      source_date,
      rating: 5,
      headline,
      quote,
      wp_id: r.wp_id,
      published: true,
    });
  }

  console.log(`→ upserting ${toUpsert.length} testimonials`);
  // Upsert by wp_id (idempotent across re-runs)
  const { data: existing } = await client
    .from("testimonials")
    .select("id, wp_id");
  const existingByWpId = new Map<number, string>();
  for (const e of existing ?? []) existingByWpId.set(e.wp_id!, e.id);

  const inserted: TestimonialRow[] = [];
  const updated: TestimonialRow[] = [];
  for (const t of toUpsert) {
    const existingId = existingByWpId.get(t.wp_id);
    if (existingId) {
      const { data, error } = await client
        .from("testimonials")
        .update(t)
        .eq("id", existingId)
        .select("id")
        .single();
      if (error) throw error;
      updated.push({ ...t, id: data.id });
    } else {
      const { data, error } = await client
        .from("testimonials")
        .insert(t)
        .select("id")
        .single();
      if (error) throw error;
      inserted.push({ ...t, id: data.id });
    }
  }
  console.log(`✓ ${inserted.length} new, ${updated.length} updated`);

  // Build set -> testimonial membership from categories
  console.log("→ rebuilding testimonial_set_items from v2 category mapping");

  const { data: sets } = await client.from("testimonial_sets").select("id, slug");
  const setIdBySlug = new Map<string, string>();
  for (const s of sets ?? []) setIdBySlug.set(s.slug, s.id);

  // Clear existing items first (idempotent)
  await client.from("testimonial_set_items").delete().neq("set_id", "00000000-0000-0000-0000-000000000000");

  const allTestimonials = [...inserted, ...updated];
  const items: { set_id: string; testimonial_id: string; sort_order: number }[] = [];
  let nextOrder: Record<string, number> = {};
  for (const t of allTestimonials) {
    if (!t.id) continue;
    const cats = categoriesByWpId.get(t.wp_id) ?? [];
    const targetSetSlugs = new Set<string>();
    for (const c of cats) {
      for (const slug of CATEGORY_TO_SET[c] ?? []) targetSetSlugs.add(slug);
    }
    // If no categories matched any mapping, default to homepage set (better than hiding)
    if (targetSetSlugs.size === 0) targetSetSlugs.add("homepage");
    for (const slug of targetSetSlugs) {
      const setId = setIdBySlug.get(slug);
      if (!setId) continue;
      items.push({
        set_id: setId,
        testimonial_id: t.id,
        sort_order: nextOrder[setId] = (nextOrder[setId] ?? 0) + 1,
      });
    }
  }
  console.log(`→ inserting ${items.length} set memberships`);

  const chunk = 200;
  for (let i = 0; i < items.length; i += chunk) {
    const { error } = await client
      .from("testimonial_set_items")
      .insert(items.slice(i, i + chunk));
    if (error) throw error;
  }

  // Report per-set counts
  console.log("\n=== Set counts ===");
  for (const s of sets ?? []) {
    const { count } = await client
      .from("testimonial_set_items")
      .select("*", { count: "exact", head: true })
      .eq("set_id", s.id);
    console.log(`  ${s.slug.padEnd(20)} ${count}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
