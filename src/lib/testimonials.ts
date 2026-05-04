import "server-only";
import { supabaseServerOrNull } from "./supabase-server";

/**
 * TripAdvisor-sourced testimonial. Schema matches the columns in the
 * source spreadsheet (Trip Advisor - Simple Reviews 1-150.xlsx) — no
 * reviewer name is stored, by design. Reviews are Anamaya-as-a-whole;
 * we don't try to attach them to specific programs.
 */
export type Testimonial = {
  id: string;
  review_number: number | null;
  review_id: string;
  review_url: string | null;
  title: string | null;
  rating: number;          // always 5 today; kept for honest display next to TripAdvisor's bubbles
  date_of_stay: string | null;
  trip_type: string | null;
  /** TripAdvisor reviewer handle / display name. Optional — manually
   *  populated since the original CSV didn't include it. */
  author: string | null;
  review_text: string;     // full review (used for "show full review" toggle / SEO)
  /** Per-category sound-bite excerpt — what the carousel displays.
   *  Null means the editor hasn't written one yet; renderer falls back
   *  to the first ~280 chars of review_text. */
  excerpt: string | null;
  /** Per-category featured flag. The Testimonials block renders only
   *  featured rows from its assigned category. */
  featured: boolean;
};

export type TestimonialSet = {
  slug: string;
  name: string;
  autoplay_ms: number;
  testimonials: Testimonial[];
};

export async function getTestimonialSet(slug: string): Promise<TestimonialSet | null> {
  const sb = supabaseServerOrNull();
  if (!sb) {
    // eslint-disable-next-line no-console
    console.warn("[testimonials] Supabase env vars missing; returning empty set");
    return null;
  }

  const { data: set, error: setErr } = await sb
    .from("testimonial_sets")
    .select("id, slug, name, autoplay_ms")
    .eq("slug", slug)
    .maybeSingle();
  if (setErr) {
    // eslint-disable-next-line no-console
    console.warn("[testimonials] fetch failed:", setErr.message);
    return null;
  }
  if (!set) return null;

  const { data: items, error: itemsErr } = await sb
    .from("testimonial_set_items")
    .select(
      // `testimonials(*)` instead of an explicit column list so this
      // query doesn't break when a column is added to testimonials
      // before PostgREST's schema cache reloads.
      "sort_order, excerpt, featured, testimonials(*)",
    )
    .eq("set_id", set.id)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });
  if (itemsErr) {
    // eslint-disable-next-line no-console
    console.warn("[testimonials] items fetch failed:", itemsErr.message);
    return { slug: set.slug, name: set.name, autoplay_ms: set.autoplay_ms ?? 6000, testimonials: [] };
  }

  const testimonials: Testimonial[] = (items ?? [])
    .map((i) => {
      const row = i as { excerpt: string | null; featured: boolean | null; testimonials: unknown };
      const t = row.testimonials as Record<string, unknown> | null;
      if (!t || t.published !== true) return null;
      return {
        id: t.id as string,
        review_number: (t.review_number as number | null) ?? null,
        review_id: t.review_id as string,
        review_url: (t.review_url as string | null) ?? null,
        title: (t.title as string | null) ?? null,
        rating: (t.rating as number | null) ?? 5,
        date_of_stay: (t.date_of_stay as string | null) ?? null,
        trip_type: (t.trip_type as string | null) ?? null,
        author: (t.author as string | null) ?? null,
        review_text: t.review_text as string,
        excerpt: row.excerpt,
        featured: row.featured ?? false,
      } satisfies Testimonial;
    })
    .filter((t): t is Testimonial => t !== null);

  return {
    slug: set.slug,
    name: set.name,
    autoplay_ms: set.autoplay_ms ?? 6000,
    testimonials,
  };
}

/**
 * Fetch testimonials for the public Testimonials block.
 *
 * Behaviour:
 *   - If at least one testimonial in the category is marked featured,
 *     return ONLY featured ones (curated rotation).
 *   - If NO testimonial is marked featured, fall back to ALL
 *     testimonials in the category so the block doesn't appear
 *     broken before the editor has had a chance to mark favourites.
 *
 * This matches the editor's mental model: featured is opt-in;
 * starting from "show everything" and narrowing down feels right.
 */
export async function getFeaturedTestimonials(
  slug: string,
  max?: number,
): Promise<Testimonial[]> {
  const set = await getTestimonialSet(slug);
  if (!set) return [];
  const featured = set.testimonials.filter((t) => t.featured);
  const list = featured.length > 0 ? featured : set.testimonials;
  return typeof max === "number" ? list.slice(0, max) : list;
}
