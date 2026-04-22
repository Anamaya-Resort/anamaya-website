import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import TemplateEditor from "@/components/admin/templates/TemplateEditor";

export const dynamic = "force-dynamic";

export default async function EditTemplate({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = supabaseServer();

  const { data: template } = await sb
    .from("page_templates")
    .select("id, slug, name")
    .eq("id", id)
    .maybeSingle();
  if (!template) notFound();

  const { data: variants } = await sb
    .from("page_template_variants")
    .select("id, slug, name, is_default")
    .eq("page_template_id", id)
    .order("created_at");

  const defaultVariant = (variants ?? []).find((v) => v.is_default) ?? (variants ?? [])[0] ?? null;

  // Blocks inside the default variant, in order, with the data needed for
  // live rendering + the info box (name, slug, block id for the Edit link).
  const { data: rows } = defaultVariant
    ? await sb
        .from("page_template_variant_blocks")
        .select("id, sort_order, block:blocks(id, slug, name, type_slug)")
        .eq("page_template_variant_id", defaultVariant.id)
        .order("sort_order")
    : { data: [] };

  // All blocks — used by the inserter modal to let the editor pick one.
  const { data: allBlocks } = await sb
    .from("blocks")
    .select("id, slug, name, type_slug, snapshot_url")
    .order("type_slug")
    .order("name");

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/templates" className="text-xs uppercase tracking-wider text-anamaya-charcoal/60 hover:text-anamaya-charcoal">
            ← Templates
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-anamaya-charcoal">{template.name}</h1>
          <code className="mt-1 inline-block rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-anamaya-charcoal/80">
            {template.slug}
          </code>
          {template.slug === "home" && (
            <span className="ml-2 text-xs italic text-anamaya-charcoal/60">
              Preview at <Link href="/home2" target="_blank" className="underline">/home2</Link>
            </span>
          )}
        </div>
      </header>

      <TemplateEditor
        templateId={template.id}
        variant={defaultVariant}
        rows={(rows ?? []).map((r) => ({
          id: r.id,
          sort_order: r.sort_order,
          block: r.block as unknown as {
            id: string;
            slug: string;
            name: string;
            type_slug: string;
          },
        }))}
        allBlocks={(allBlocks ?? []) as Array<{
          id: string;
          slug: string;
          name: string;
          type_slug: string;
          snapshot_url: string | null;
        }>}
      />
    </div>
  );
}
