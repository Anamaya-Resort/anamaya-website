import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { createTemplate } from "./actions";

export const dynamic = "force-dynamic";

export default async function TemplatesIndex() {
  const sb = supabaseServer();
  const { data: templates } = await sb
    .from("templates")
    .select("id, slug, name, updated_at")
    .order("name");

  async function newTemplate(formData: FormData) {
    "use server";
    const slug = String(formData.get("slug") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim() || "New template";
    if (!slug) return;
    const id = await createTemplate(slug, name);
    redirect(`/admin/templates/${id}`);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-anamaya-charcoal">Templates</h1>
          <p className="mt-1 max-w-2xl text-sm text-anamaya-charcoal/70">
            A template is an ordered list of blocks that make up a page layout
            (Home, Retreat, Blog Post, …). Each template can have multiple
            variants for A/B testing.
          </p>
        </div>
        <form action={newTemplate} className="flex items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
              Slug
            </span>
            <input
              name="slug"
              required
              placeholder="e.g. retreat"
              className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
              Name
            </span>
            <input
              name="name"
              placeholder="e.g. Retreat Page"
              className="w-48 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-anamaya-green px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark"
          >
            + Create
          </button>
        </form>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(templates ?? []).map((t) => (
          <li key={t.id}>
            <Link
              href={`/admin/templates/${t.id}`}
              className="block rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm transition-shadow hover:shadow-sm"
            >
              <div className="font-semibold text-anamaya-charcoal">{t.name}</div>
              <code className="mt-1 inline-block rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-anamaya-charcoal/80">
                {t.slug}
              </code>
            </Link>
          </li>
        ))}
        {(templates ?? []).length === 0 && (
          <li className="text-sm italic text-anamaya-charcoal/50">
            No templates yet — run migration 0012 or create one above.
          </li>
        )}
      </ul>
    </div>
  );
}
