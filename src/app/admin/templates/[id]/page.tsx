import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import TemplateEditor from "@/components/admin/templates/TemplateEditor";

export const dynamic = "force-dynamic";

// Reference viewport height we pretend the admin iframes render inside.
// Hero `cover` blocks specify height as a vh percentage; this lets us
// compute a concrete pixel height so the iframe is exactly the block's
// rendered height (no empty space below).
const REFERENCE_VH_PX = 900;

/** Best-guess pixel height for an iframe that should contain the given block. */
function computeIframeHeight(block: {
  type_slug: string;
  content: Record<string, unknown> | null;
}): number {
  const c = (block.content ?? {}) as Record<string, unknown>;
  switch (block.type_slug) {
    case "hero": {
      const fit = c.fit === "cover" ? "cover" : "aspect";
      if (fit === "cover") {
        const vh = typeof c.height_vh === "number" ? c.height_vh : 80;
        return Math.round((vh / 100) * REFERENCE_VH_PX);
      }
      // 16:9 aspect at a typical admin preview width (~1100px wide).
      return Math.round(1100 * (9 / 16));
    }
    case "press_bar": {
      const h = typeof c.section_height_px === "number" ? c.section_height_px : 200;
      return h;
    }
    case "cta_banner":
      return 360;
    case "rich_text":
      return 400;
    default:
      return 360;
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
            iframe_height: computeIframeHeight(block),
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
  );
}
