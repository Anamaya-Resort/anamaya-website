import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { saveSetAssignments } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditSet({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = supabaseServer();

  const { data: set } = await sb
    .from("testimonial_sets")
    .select("id, slug, name, description, autoplay_ms")
    .eq("id", id)
    .maybeSingle();
  if (!set) notFound();

  const { data: allTestimonials } = await sb
    .from("testimonials")
    .select(
      "id, review_number, review_id, review_url, title, rating, date_of_stay, trip_type, review_text, published",
    )
    .order("review_number", { ascending: true, nullsFirst: false });

  const { data: itemRows } = await sb
    .from("testimonial_set_items")
    .select("testimonial_id, sort_order, excerpt, featured")
    .eq("set_id", id)
    .eq("is_visible", true)
    .order("sort_order");

  const memberByTid = new Map(
    (itemRows ?? []).map((r) => [
      r.testimonial_id as string,
      {
        sort_order: r.sort_order as number,
        excerpt: ((r as { excerpt?: string | null }).excerpt as string | null) ?? "",
        featured: ((r as { featured?: boolean | null }).featured as boolean | null) ?? false,
      },
    ]),
  );

  // Only the testimonials currently assigned to this category are
  // rendered — the page is for managing assignments, not adding new ones.
  const tidToTestimonial = new Map(
    (allTestimonials ?? []).map((t) => [t.id, t]),
  );
  const assignedOrdered = (itemRows ?? [])
    .map((r) => tidToTestimonial.get(r.testimonial_id as string))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  async function save(formData: FormData) {
    "use server";
    const tids = formData.getAll("testimonial_id").map(String);
    const keeps = formData.getAll("keep").map(String);
    const keepSet = new Set(keeps);
    const featuredSet = new Set(formData.getAll("featured").map(String));
    const rows: Array<{
      testimonial_id: string;
      excerpt: string;
      sort_order: number;
      featured: boolean;
    }> = [];
    let order = 0;
    for (const tid of tids) {
      if (!keepSet.has(tid)) continue;
      const excerpt = String(formData.get(`excerpt:${tid}`) ?? "");
      rows.push({
        testimonial_id: tid,
        excerpt,
        sort_order: order,
        featured: featuredSet.has(tid),
      });
      order += 1;
    }
    await saveSetAssignments(id, rows);
    redirect(`/admin/testimonials/sets/${id}`);
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">{set.name}</h1>
        <p className="mt-1 text-sm text-anamaya-charcoal/60">
          slug: <code className="rounded bg-zinc-100 px-1">{set.slug}</code>
          {set.description && <> — {set.description}</>}
        </p>
        <p className="mt-1 text-sm text-anamaya-charcoal/60">
          {assignedOrdered.length} review{assignedOrdered.length === 1 ? "" : "s"} assigned
        </p>
      </header>

      <form action={save} className="space-y-8">
        <div className="sticky top-0 z-10 -mx-2 flex items-center gap-4 border-b border-zinc-200 bg-white/95 px-2 py-3 backdrop-blur">
          <button
            type="submit"
            className="rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-anamaya-green-dark"
          >
            Save changes
          </button>
          <span className="text-xs text-anamaya-charcoal/60">
            Uncheck a row to remove it. Edits to excerpts also save with this button.
          </span>
        </div>

        <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-anamaya-olive-dark">
            Assigned to this category
          </h2>
          <p className="mb-4 text-sm text-anamaya-charcoal/70">
            The <strong>excerpt</strong> is what shows on the website carousel — usually 1–2
            sentences of the original review that fit this category. The full review is shown
            below for context. Uncheck a row to remove it from this category on save.
          </p>
          {assignedOrdered.length === 0 ? (
            <p className="rounded-md bg-zinc-50 p-4 text-sm text-anamaya-charcoal/60">
              Nothing assigned yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {assignedOrdered.map((t) => (
                <li key={t.id}>
                  <ReviewRow
                    t={t}
                    assigned
                    excerpt={memberByTid.get(t.id)?.excerpt ?? ""}
                    featured={memberByTid.get(t.id)?.featured ?? false}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="sticky bottom-0 -mx-6 border-t border-zinc-200 bg-white/95 p-4 backdrop-blur sm:mx-0 sm:rounded-lg sm:border sm:p-4 sm:shadow-lg">
          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
            >
              Save category
            </button>
            <Link
              href="/admin/testimonials"
              className="text-sm text-anamaya-charcoal/70 hover:underline"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

function ReviewRow({
  t,
  assigned,
  excerpt,
  featured,
}: {
  t: {
    id: string;
    review_number: number | null;
    review_id: string;
    review_url: string | null;
    title: string | null;
    rating: number;
    date_of_stay: string | null;
    trip_type: string | null;
    review_text: string;
    published: boolean;
  };
  assigned: boolean;
  excerpt: string;
  featured: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-4 ${
        assigned ? "border-anamaya-mint bg-anamaya-mint/10" : "border-zinc-200 bg-white"
      }`}
    >
      <input type="hidden" name="testimonial_id" value={t.id} />
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          name="keep"
          value={t.id}
          defaultChecked={assigned}
          className="mt-1.5"
          aria-label={`Include review ${t.review_number ?? t.review_id} in this category`}
        />
        <div className="flex-1 space-y-3">
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            <span className="font-mono text-xs text-anamaya-charcoal/50">
              #{t.review_number ?? "?"}
            </span>
            <span className="text-lg font-semibold text-anamaya-charcoal">
              {t.title ?? <em className="text-anamaya-charcoal/40">No title</em>}
            </span>
            <span className="text-xs text-anamaya-charcoal/60">
              {[t.date_of_stay, t.trip_type].filter(Boolean).join(" · ")}
            </span>
            {!t.published && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase text-amber-800">
                Unpublished
              </span>
            )}
            {t.review_url && (
              <a
                href={t.review_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs text-anamaya-charcoal/50 hover:text-anamaya-green hover:underline"
              >
                View on TripAdvisor ↗
              </a>
            )}
          </header>

          {assigned && (
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
                Excerpt (shown on the website)
              </span>
              <textarea
                name={`excerpt:${t.id}`}
                rows={3}
                defaultValue={excerpt}
                placeholder="1–2 sentence sound-bite from the review text below…"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
              />
            </label>
          )}

          <details className={assigned ? "" : ""}>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/60 hover:text-anamaya-green">
              {assigned ? "Show full review" : "Preview full review"}
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-anamaya-charcoal/80">
              {t.review_text}
            </p>
          </details>

          {assigned && (
            <div className="flex justify-end pt-1">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ring-1 ring-anamaya-mint hover:bg-anamaya-mint/20">
                <input
                  type="checkbox"
                  name="featured"
                  value={t.id}
                  defaultChecked={featured}
                  className="h-4 w-4 accent-anamaya-green"
                />
                <span className="text-anamaya-charcoal">★ Featured</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
