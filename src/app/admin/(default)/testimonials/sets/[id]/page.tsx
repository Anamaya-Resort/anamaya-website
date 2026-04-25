import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { updateSetMembership } from "../../actions";

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
    .select("id, author, headline, source, source_date, published")
    .order("author");

  const { data: itemRows } = await sb
    .from("testimonial_set_items")
    .select("testimonial_id, sort_order")
    .eq("set_id", id)
    .order("sort_order");
  const memberIds = new Set((itemRows ?? []).map((r) => r.testimonial_id));

  async function save(formData: FormData) {
    "use server";
    // Preserve the order as given in form (values submitted in DOM order).
    const selected = formData.getAll("testimonial_ids").map(String);
    await updateSetMembership(id, selected);
    redirect("/admin/testimonials");
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
          {memberIds.size} testimonial{memberIds.size === 1 ? "" : "s"} currently assigned
        </p>
      </header>

      <form action={save} className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <p className="mb-4 text-sm text-anamaya-charcoal/70">
          Check the testimonials to include in this set. They will cycle through
          on any page using <code className="rounded bg-zinc-100 px-1">setSlug=&quot;{set.slug}&quot;</code>.
        </p>
        <div className="max-h-[600px] overflow-y-auto rounded-md border border-zinc-200 divide-y divide-zinc-100">
          {(allTestimonials ?? []).map((t) => (
            <label
              key={t.id}
              className="flex items-start gap-3 px-3 py-3 text-sm hover:bg-zinc-50"
            >
              <input
                type="checkbox"
                name="testimonial_ids"
                value={t.id}
                defaultChecked={memberIds.has(t.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">
                  {t.headline ?? t.author}{" "}
                  {!t.published && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase text-amber-800">
                      Unpublished
                    </span>
                  )}
                </div>
                <div className="text-xs text-anamaya-charcoal/60">
                  — {t.author}
                  {t.source && <>, {t.source}</>}
                  {t.source_date && <>, {t.source_date}</>}
                </div>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4">
          <button
            type="submit"
            className="rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
          >
            Save set
          </button>
          <a href="/admin/testimonials" className="text-sm text-anamaya-charcoal/70 hover:underline">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
