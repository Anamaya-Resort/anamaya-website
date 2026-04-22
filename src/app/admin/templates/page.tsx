import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { createTemplate } from "./actions";
import TemplateCard, { type TemplateCardBlock } from "@/components/admin/templates/TemplateCard";

export const dynamic = "force-dynamic";

export default async function TemplatesIndex() {
  const sb = supabaseServer();
  const { data: templates } = await sb
    .from("page_templates")
    .select("id, slug, name, updated_at")
    .order("name");

  // For each template, fetch its default variant + ordered block snapshots.
  // Done sequentially — admin is low-volume, and Promise.all would just
  // hammer Supabase with parallel requests for the same small index.
  const cards: Array<{
    id: string;
    slug: string;
    name: string;
    blocks: TemplateCardBlock[];
  }> = [];
  for (const t of templates ?? []) {
    const { data: variant } = await sb
      .from("page_template_variants")
      .select("id")
      .eq("page_template_id", t.id)
      .eq("is_default", true)
      .maybeSingle();
    let blocks: TemplateCardBlock[] = [];
    if (variant) {
      const { data: rows } = await sb
        .from("page_template_variant_blocks")
        .select("sort_order, block:blocks(id, name, snapshot_url)")
        .eq("page_template_variant_id", variant.id)
        .order("sort_order");
      blocks = (rows ?? [])
        .map((r) => r.block as unknown as TemplateCardBlock | null)
        .filter((b): b is TemplateCardBlock => !!b);
    }
    cards.push({ id: t.id, slug: t.slug, name: t.name, blocks });
  }

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
            variants for A/B testing. Each card previews the live block stack.
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

      {/* Vertical cards — 300 px wide, up to 1200 px tall, flowing left-to-right
          and wrapping. Fits 3-4 across on a typical admin viewport. */}
      <div className="flex flex-wrap items-start gap-4">
        {cards.map((c) => (
          <TemplateCard
            key={c.id}
            id={c.id}
            slug={c.slug}
            name={c.name}
            blocks={c.blocks}
          />
        ))}
        {cards.length === 0 && (
          <div className="text-sm italic text-anamaya-charcoal/50">
            No templates yet — create one above.
          </div>
        )}
      </div>
    </div>
  );
}
