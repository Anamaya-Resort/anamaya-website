import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import TemplateEditor from "@/components/admin/templates/TemplateEditor";

export const dynamic = "force-dynamic";

// Reference viewport for the admin previews. Each iframe renders at these
// NATIVE pixel dimensions and is visually scaled down to fit the preview
// wrapper — so proportions match the live site exactly regardless of how
// wide the admin column is. Pixel sizes inside the iframe (logo heights,
// text sizes, etc.) shrink proportionally instead of overflowing.
const REF_W = 1440;
const REF_H = 900;

/** Live-site height in px for the given block at the reference width. */
function computeNativeHeight(block: {
  type_slug: string;
  content: Record<string, unknown> | null;
}): number {
  const c = (block.content ?? {}) as Record<string, unknown>;
  switch (block.type_slug) {
    case "hero": {
      if (c.fit === "cover") {
        const vh = typeof c.height_vh === "number" ? c.height_vh : 80;
        return Math.round(REF_H * (vh / 100));
      }
      return Math.round(REF_W * (9 / 16)); // aspect-mode: 16:9 player
    }
    case "press_bar": {
      const h = typeof c.section_height_px === "number" ? c.section_height_px : 200;
      return h;
    }
    case "cta_banner":
      return 360;
    case "rich_text":
      return 400;
    case "rich_bg":
      return 420;
    case "video_showcase":
      return 640;
    case "checklist":
      return 360;
    case "newsletter":
      return 280;
    case "image_overlay":
      return typeof c.height_px === "number" ? c.height_px : 480;
    case "image_text":
      return 420;
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
  // Defensive: if 0028 hasn't been applied yet, is_locked is missing —
  // fall back to the legacy shape with everything locked.
  type RawRow = {
    id: string;
    sort_order: number;
    is_locked?: boolean;
    block: {
      id: string;
      slug: string;
      name: string;
      type_slug: string;
      content: Record<string, unknown> | null;
    } | null;
  };
  let rows: RawRow[] = [];
  if (defaultVariant) {
    const withLock = await sb
      .from("page_template_variant_blocks")
      .select("id, sort_order, is_locked, block:blocks(id, slug, name, type_slug, content)")
      .eq("page_template_variant_id", defaultVariant.id)
      .order("sort_order");
    if (!withLock.error) {
      rows = (withLock.data ?? []) as unknown as RawRow[];
    } else {
      const fb = await sb
        .from("page_template_variant_blocks")
        .select("id, sort_order, block:blocks(id, slug, name, type_slug, content)")
        .eq("page_template_variant_id", defaultVariant.id)
        .order("sort_order");
      rows = ((fb.data ?? []) as unknown as RawRow[]).map((r) => ({
        ...r,
        is_locked: true,
      }));
    }
  }

  // All blocks — used by the inserter modal to let the editor pick one.
  const { data: allBlocks } = await sb
    .from("blocks")
    .select("id, slug, name, type_slug, snapshot_url")
    .order("type_slug")
    .order("name");

  // Lookup table: type_slug → is_overlay. Defensive: older databases
  // without 0025 won't have the column; default everything to false.
  const { data: typesRaw } = await sb
    .from("block_types")
    .select("slug, is_overlay");
  const overlayBySlug = new Map<string, boolean>(
    (typesRaw ?? []).map((t) => [t.slug as string, Boolean((t as { is_overlay?: boolean }).is_overlay)]),
  );

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
        referenceWidth={REF_W}
        rows={rows
          // Guard against rows whose block row is missing/stale. Accessing
          // block.type_slug on a null would 500 the whole page.
          .filter((r) => r.block != null)
          .map((r) => {
            const block = r.block as unknown as {
              id: string;
              slug: string;
              name: string;
              type_slug: string;
              content: Record<string, unknown> | null;
            };
            const nativeH = Math.max(1, computeNativeHeight(block));
            const isOverlay = overlayBySlug.get(block.type_slug) ?? false;
            const c = (block.content ?? {}) as Record<string, unknown>;
            return {
              id: r.id,
              sort_order: r.sort_order,
              native_height: nativeH,
              aspect_ratio: REF_W / nativeH,
              is_overlay: isOverlay,
              is_locked: r.is_locked !== false,
              overlay_z: typeof c.overlay_z === "number" ? c.overlay_z : null,
              overlay_anchor: typeof c.overlay_anchor === "string" ? (c.overlay_anchor as string) : null,
              overlay_trigger: typeof c.overlay_trigger === "string" ? (c.overlay_trigger as string) : null,
              block: {
                id: block.id,
                slug: block.slug,
                name: block.name,
                type_slug: block.type_slug,
              },
            };
          })
          // Overlays first (matches their fixed-position rendering order
          // — they sit on top of regular blocks at runtime). Within each
          // group preserve the variant's sort_order.
          .sort((a, b) => {
            if (a.is_overlay !== b.is_overlay) return a.is_overlay ? -1 : 1;
            return a.sort_order - b.sort_order;
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
