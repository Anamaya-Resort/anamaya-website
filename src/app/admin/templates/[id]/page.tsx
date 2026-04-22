import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import TemplateEditor from "@/components/admin/templates/TemplateEditor";

export const dynamic = "force-dynamic";

// Reference viewport we assume when picking aspect ratios for the admin
// preview iframes. `hero` cover blocks specify height in vh, so they get
// an aspect derived from a 1440×900 reference. Other block types have an
// absolute pixel height — we combine that with the reference width.
const REF_W = 1440;
const REF_H = 900;

/**
 * Aspect ratio (width / height) for an iframe containing the given block.
 * The iframe fills the admin area's width and the browser computes its
 * height via `aspect-ratio` — that way the ratio matches the live site
 * exactly even as the admin width changes.
 */
function computeAspectRatio(block: {
  type_slug: string;
  content: Record<string, unknown> | null;
}): number {
  const c = (block.content ?? {}) as Record<string, unknown>;
  switch (block.type_slug) {
    case "hero": {
      if (c.fit === "cover") {
        const vh = typeof c.height_vh === "number" ? c.height_vh : 80;
        return REF_W / (REF_H * (vh / 100));
      }
      return 16 / 9;
    }
    case "press_bar": {
      const h = typeof c.section_height_px === "number" ? c.section_height_px : 200;
      return REF_W / h;
    }
    case "cta_banner":
      return REF_W / 360;
    case "rich_text":
      return REF_W / 400;
    default:
      return REF_W / 360;
  }
}

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

  // Blocks inside the default variant, in order. We also pull `content`
  // so the page can compute a per-block iframe height that matches the
  // block's natural rendered size (no empty space below).
  const { data: rows } = defaultVariant
    ? await sb
        .from("page_template_variant_blocks")
        .select("id, sort_order, block:blocks(id, slug, name, type_slug, content)")
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

      {/* Break out of the admin's max-w-6xl container so the block
          previews can render at close to full browser width — matches
          how they look on the real site. */}
      <div style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }}>
        <div className="px-4">
          <TemplateEditor
            templateId={template.id}
            variant={defaultVariant}
            rows={(rows ?? []).map((r) => {
              const block = r.block as unknown as {
                id: string;
                slug: string;
                name: string;
                type_slug: string;
                content: Record<string, unknown> | null;
              };
              return {
                id: r.id,
                sort_order: r.sort_order,
                aspect_ratio: computeAspectRatio(block),
                block: {
                  id: block.id,
                  slug: block.slug,
                  name: block.name,
                  type_slug: block.type_slug,
                },
              };
            })}
            allBlocks={(allBlocks ?? []) as Array<{
              id: string;
              slug: string;
              name: string;
              type_slug: string;
              snapshot_url: string | null;
            }>}
          />
        </div>
      </div>
    </div>
  );
}
