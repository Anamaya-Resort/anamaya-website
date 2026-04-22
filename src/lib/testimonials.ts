import "server-only";
import { supabaseServerOrNull } from "./supabase-server";

export type Testimonial = {
  id: string;
  author: string;
  source: string | null;
  source_date: string | null;
  rating: number;
  headline: string | null;
  quote: string;
  avatar_url: string | null;
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
    // Most common cause: migration 0004 hasn't run yet. Return null so the
    // carousel renders its empty state instead of crashing the page.
    // eslint-disable-next-line no-console
    console.warn("[testimonials] fetch failed:", setErr.message);
    return null;
  }
  if (!set) return null;

  const { data: items, error: itemsErr } = await sb
    .from("testimonial_set_items")
    .select("sort_order, testimonials(id, author, source, source_date, rating, headline, quote, avatar_url, published)")
    .eq("set_id", set.id)
    .order("sort_order", { ascending: true });
  if (itemsErr) {
    // eslint-disable-next-line no-console
    console.warn("[testimonials] items fetch failed:", itemsErr.message);
    return { slug: set.slug, name: set.name, autoplay_ms: set.autoplay_ms ?? 6000, testimonials: [] };
  }

  const testimonials: Testimonial[] = (items ?? [])
    .map((i: any) => i.testimonials)
    .filter((t: any) => t && t.published)
    .map((t: any) => ({
      id: t.id,
      author: t.author,
      source: t.source,
      source_date: t.source_date,
      rating: t.rating ?? 5,
      headline: t.headline,
      quote: t.quote,
      avatar_url: t.avatar_url,
    }));

  return {
    slug: set.slug,
    name: set.name,
    autoplay_ms: set.autoplay_ms ?? 6000,
    testimonials,
  };
}
