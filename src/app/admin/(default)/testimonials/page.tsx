import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { createTestimonial, deleteTestimonial } from "./actions";

export const dynamic = "force-dynamic";

export default async function TestimonialsAdmin() {
  const sb = supabaseServer();
  const [{ data: testimonials }, { data: sets }, { count: total }] = await Promise.all([
    sb
      .from("testimonials")
      .select("id, author, source, source_date, headline, quote, rating, published, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500),
    sb
      .from("testimonial_sets")
      .select("id, slug, name, description")
      .order("slug"),
    sb.from("testimonials").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-anamaya-charcoal">Testimonials</h1>
          <p className="mt-1 text-sm text-anamaya-charcoal/70">
            {total ?? 0} total · assign them into sets below, and those sets appear on pages.
          </p>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-anamaya-olive-dark">
          Sets
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
          Add a new testimonial
        </h2>
        <form
          action={createTestimonial}
          className="grid grid-cols-1 gap-3 rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:grid-cols-2"
        >
          <Input name="author"      label="Author"         required />
          <Input name="source"      label="Source"         placeholder="TripAdvisor, Google, …" />
          <Input name="source_date" label="Date"           placeholder="November 2011" />
          <Input name="rating"      label="Rating (1-5)"   type="number" min={1} max={5} defaultValue={5} />
          <Input name="headline"    label="Headline"       className="sm:col-span-2" placeholder="Treasure in Paradise…" />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
              Quote
            </label>
            <textarea
              name="quote"
              required
              rows={4}
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
            Add Testimonial
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-anamaya-olive-dark">
          All testimonials ({testimonials?.length ?? 0})
        </h2>
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-anamaya-charcoal/60">
              <tr>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Headline</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(testimonials ?? []).map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-medium">{t.author}</td>
                  <td className="px-4 py-3 text-anamaya-charcoal/70">{t.headline ?? "—"}</td>
                  <td className="px-4 py-3 text-anamaya-charcoal/70">
                    {[t.source, t.source_date].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">{t.rating}/5</td>
                  <td className="px-4 py-3">{t.published ? "Yes" : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/testimonials/${t.id}`}
                      className="text-anamaya-green hover:underline"
                    >
                      Edit
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await deleteTestimonial(t.id);
                      }}
                      className="inline"
                    >
                      <button
                        type="submit"
                        className="ml-4 text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
