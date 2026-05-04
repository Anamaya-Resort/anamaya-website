import Link from "next/link";
import Image from "next/image";
import { supabaseServer } from "@/lib/supabase-server";
import { createTestimonial } from "./actions";
import TestimonialsList from "./TestimonialsList";

export const dynamic = "force-dynamic";

export default async function TestimonialsAdmin() {
  const sb = supabaseServer();
  const [{ data: testimonials }, { data: sets }, { count: total }, { data: setItemRows }] =
    await Promise.all([
      sb
        .from("testimonials")
        .select(
          "id, review_number, review_id, review_url, title, rating, date_of_stay, trip_type, author, review_text, published, updated_at",
        )
        .order("review_number", { ascending: true, nullsFirst: false })
        .limit(500),
      sb
        .from("testimonial_sets")
        .select("id, slug, name, description")
        .order("slug"),
      sb.from("testimonials").select("*", { count: "exact", head: true }),
      sb
        .from("testimonial_set_items")
        .select("testimonial_id, excerpt, is_visible, testimonial_sets(slug, name)"),
    ]);

  // Build a per-testimonial list of categories + excerpt assignments.
  type SetEmbed = { slug: string; name: string };
  type SetItemRow = {
    testimonial_id: string;
    excerpt: string | null;
    is_visible: boolean | null;
    testimonial_sets: SetEmbed | SetEmbed[] | null;
  };
  const categoriesByTid = new Map<
    string,
    Array<{ slug: string; name: string; excerpt: string | null; is_visible: boolean }>
  >();
  for (const r of (setItemRows ?? []) as SetItemRow[]) {
    const setRef = Array.isArray(r.testimonial_sets)
      ? r.testimonial_sets[0]
      : r.testimonial_sets;
    if (!setRef) continue;
    const list = categoriesByTid.get(r.testimonial_id) ?? [];
    list.push({
      slug: setRef.slug,
      name: setRef.name,
      excerpt: r.excerpt,
      is_visible: r.is_visible ?? true,
    });
    categoriesByTid.set(r.testimonial_id, list);
  }
  // Sort each list alphabetically by category name for consistent display.
  for (const list of categoriesByTid.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const testimonialsWithCats = (testimonials ?? []).map((t) => ({
    ...t,
    categories: categoriesByTid.get(t.id) ?? [],
  }));

  return (
    <div className="space-y-10">
      <header className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-5">
          <Image
            src="/img/tripadvisor-5-stars.webp"
            alt="TripAdvisor 5-star reviews"
            width={120}
            height={48}
            className="h-12 w-auto"
            priority
          />
          <div>
            <h1 className="text-2xl font-semibold text-anamaya-charcoal">Testimonials</h1>
            <p className="mt-1 text-sm text-anamaya-charcoal/70">
              {total ?? 0} reviews imported from TripAdvisor · assign them into categories below.
            </p>
          </div>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-anamaya-olive-dark">
          Categories
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(sets ?? []).map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/testimonials/sets/${s.id}`}
                className="block rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm transition-shadow hover:shadow-sm"
              >
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-anamaya-charcoal/60">/{s.slug}</div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-anamaya-olive-dark">
          Add a new TripAdvisor review
        </h2>
        <form
          action={createTestimonial}
          className="grid grid-cols-1 gap-3 rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:grid-cols-2"
        >
          <Input name="review_number" label="Review #"   type="number" placeholder="151" />
          <Input name="review_id"     label="Review ID"  required placeholder="r1052702616" />
          <Input
            name="review_url"
            label="Review URL"
            className="sm:col-span-2"
            placeholder="https://www.tripadvisor.com/ShowUserReviews-…"
          />
          <Input name="title"        label="Title"        className="sm:col-span-2" placeholder="Simply Exceptional" />
          <Input name="author"       label="Reviewer name" placeholder="Nadia C" />
          <Input name="date_of_stay" label="Date of stay" placeholder="March 2026" />
          <Input name="trip_type"    label="Trip type"    placeholder="Traveled solo" />
          <Input name="rating"       label="Rating (1-5)" type="number" min={1} max={5} defaultValue={5} />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
              Review text
            </label>
            <textarea
              name="review_text"
              required
              rows={5}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="published" defaultChecked />
            Published (visible on site)
          </label>
          <button
            type="submit"
            className="justify-self-start rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark sm:col-span-2"
          >
            Add review
          </button>
        </form>
      </section>

      {/* Break out 20% wider than the surrounding max-w-6xl admin shell on
          xl+ screens so the list table has more room for the new categories
          column. Negative margin gives ~7rem more on each side. */}
      <section className="xl:-mx-[7rem]">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-anamaya-olive-dark">
          All reviews ({testimonials?.length ?? 0})
        </h2>
        <TestimonialsList items={testimonialsWithCats} />
      </section>
    </div>
  );
}

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
  const { label, className, ...rest } = props;
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
        {label}
      </span>
      <input
        {...rest}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
      />
    </label>
  );
}
