import type { ReactNode } from "react";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import renderBlockByType from "@/components/blocks/renderBlockByType";
import TemplateAsideDrawer from "./TemplateAsideDrawer";

/**
 * Server component that renders an ordered list of blocks for a template.
 *
 * Three resolution paths:
 *   1. Pass templateSlug — looks up the template by slug. Used for
 *      hardcoded chrome (site_chrome) and preview routes (/home2).
 *   2. Pass templateId — looks up by primary key. Used by the catch-all
 *      router which already has the cms_template_id off the inventory row.
 *   3. Pass pageId — when set, the renderer fetches per-page block
 *      overrides for that page. Unlocked variant blocks with overrides
 *      get the override content; locked blocks always use the master.
 *
 * Block HTML (including schema.org JSON-LD where applicable) is part of
 * the SSR response, so everything is crawlable.
 */
export default async function TemplateRenderer({
  templateSlug,
  templateId,
  variantSlug,
  pageId,
}: {
  templateSlug?: string;
  templateId?: string;
  variantSlug?: string;
  pageId?: string;
}) {
  if (!templateSlug && !templateId) return null;
  const sb = supabaseServerOrNull();
  if (!sb) return null;

  let templateRowId: string | null = templateId ?? null;
  const templateLabel = templateSlug ?? templateId ?? "";
  if (!templateRowId && templateSlug) {
    const { data: template } = await sb
      .from("page_templates")
      .select("id")
      .eq("slug", templateSlug)
      .maybeSingle();
    if (!template) {
      return (
        <div className="mx-auto my-6 max-w-xl rounded border border-dashed border-zinc-300 px-4 py-3 text-sm italic text-anamaya-charcoal/60">
          Template <code>{templateSlug}</code> not found.
        </div>
      );
    }
    templateRowId = template.id;
  }
  if (!templateRowId) return null;

  // Variant + its chosen column layout (layout / aside_position added in
  // 0063). Defensive: on an old DB without those columns, fall back to id
  // only and treat the template as single-column.
  type VariantRow = { id: string; layout?: string | null; aside_position?: string | null };
  let variant: VariantRow | null = null;
  {
    const q = sb
      .from("page_template_variants")
      .select("id, layout, aside_position")
      .eq("page_template_id", templateRowId);
    const res = await (variantSlug
      ? q.eq("slug", variantSlug).maybeSingle()
      : q.eq("is_default", true).maybeSingle());
    if (!res.error) {
      variant = res.data as VariantRow | null;
    } else {
      const q2 = sb
        .from("page_template_variants")
        .select("id")
        .eq("page_template_id", templateRowId);
      const res2 = await (variantSlug
        ? q2.eq("slug", variantSlug).maybeSingle()
        : q2.eq("is_default", true).maybeSingle());
      variant = (res2.data ?? null) as VariantRow | null;
    }
  }
  if (!variant) {
    return (
      <div className="mx-auto my-6 max-w-xl rounded border border-dashed border-zinc-300 px-4 py-3 text-sm italic text-anamaya-charcoal/60">
        No default variant for template <code>{templateLabel}</code>.
      </div>
    );
  }
  const layout = variant.layout === "two_col" ? "two_col" : "one_col";
  const asidePos: "left" | "right" = variant.aside_position === "left" ? "left" : "right";

  // Fetch all variant blocks with their resolved master content. We need
  // type_slug + content directly so renderBlockByType can dispatch
  // without an extra per-block DB roundtrip (and so override content
  // can be swapped in without re-querying).
  // is_locked is fetched defensively — if 0028 hasn't been applied yet,
  // the column is missing. The select either succeeds with the column
  // or we fall back to "everything locked" semantics.
  type VariantBlockRow = {
    id: string;
    sort_order: number;
    is_locked?: boolean;
    block: { type_slug: string; content: unknown } | null;
  };
  let blocks: VariantBlockRow[] = [];
  const withLock = await sb
    .from("page_template_variant_blocks")
    .select("id, sort_order, is_locked, block:blocks(type_slug, content)")
    .eq("page_template_variant_id", variant.id)
    .order("sort_order");
  if (!withLock.error) {
    blocks = (withLock.data ?? []) as unknown as VariantBlockRow[];
  } else {
    const fb = await sb
      .from("page_template_variant_blocks")
      .select("id, sort_order, block:blocks(type_slug, content)")
      .eq("page_template_variant_id", variant.id)
      .order("sort_order");
    blocks = ((fb.data ?? []) as unknown as VariantBlockRow[]).map((b) => ({
      ...b,
      is_locked: true,
    }));
  }

  // Per-page overrides keyed by variant_block_id. Defensive: if 0028
  // hasn't been applied, the table is missing — treat as no overrides.
  const overrides = new Map<string, unknown>();
  if (pageId && blocks.length > 0) {
    const { data: overrideRows, error: overrideErr } = await sb
      .from("page_block_overrides")
      .select("variant_block_id, content")
      .eq("url_inventory_id", pageId)
      .in(
        "variant_block_id",
        blocks.map((b) => b.id),
      );
    if (!overrideErr) {
      for (const row of overrideRows ?? []) {
        overrides.set(row.variant_block_id as string, row.content);
      }
    }
  }

  // Block shapes (horizontal = main column, vertical = side column). If the
  // shape column is missing on an old DB, everything defaults to horizontal
  // and the template renders as a single column exactly as before.
  const shapeBy = new Map<string, string>();
  const shapeRes = await sb.from("block_types").select("slug, shape");
  if (!shapeRes.error) {
    for (const t of shapeRes.data ?? []) {
      shapeBy.set(t.slug as string, (t as { shape?: string }).shape ?? "horizontal");
    }
  }

  type Rendered = { shape: string; mode: "fixed" | "hidden"; node: ReactNode };
  const rendered: Rendered[] = [];
  for (const row of blocks) {
    if (!row.block) continue;
    const isLocked = row.is_locked !== false;
    const content =
      !isLocked && overrides.has(row.id) ? overrides.get(row.id) : row.block.content;
    const shape = shapeBy.get(row.block.type_slug) ?? "horizontal";
    const mode =
      (content as { responsive_mode?: string } | null)?.responsive_mode === "hidden"
        ? "hidden"
        : "fixed";
    rendered.push({
      shape,
      mode,
      node: <div key={row.id}>{renderBlockByType(row.block.type_slug, content, { pageId })}</div>,
    });
  }

  const main = rendered.filter((r) => r.shape !== "vertical");
  const aside = rendered.filter((r) => r.shape === "vertical");

  // Single column unless the template variant is explicitly two-column AND has
  // vertical blocks for the side column. Renders in original order.
  if (layout !== "two_col" || aside.length === 0) {
    return <>{rendered.map((r) => r.node)}</>;
  }

  const fixedAside = aside.filter((r) => r.mode !== "hidden");
  const hiddenAside = aside.filter((r) => r.mode === "hidden");

  const mainCol = <div className="min-w-0 lg:flex-1">{main.map((r) => r.node)}</div>;
  const asideCol = (
    <aside className="hidden lg:block lg:w-[350px] lg:shrink-0">
      <div className="sticky top-24 space-y-6 py-8">{aside.map((r) => r.node)}</div>
    </aside>
  );

  return (
    <>
      {/* Two-column: main column + a sticky side column, on the left or right
          per the template's aside_position. Flexbox (not an arbitrary grid
          value), so it reliably sits side-by-side and stacks below lg. */}
      <div className="mx-auto flex max-w-[1400px] flex-col gap-10 px-4 lg:flex-row lg:px-8">
        {asidePos === "left" ? (
          <>
            {asideCol}
            {mainCol}
          </>
        ) : (
          <>
            {mainCol}
            {asideCol}
          </>
        )}
      </div>

      {/* Narrow screens: FIXED vertical blocks stack inline below the main… */}
      {fixedAside.length > 0 && (
        <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 lg:hidden">
          {fixedAside.map((r) => r.node)}
        </div>
      )}
      {/* …and HIDDEN ones tuck into a slide-out tab on the aside side. */}
      {hiddenAside.length > 0 && (
        <TemplateAsideDrawer side={asidePos}>{hiddenAside.map((r) => r.node)}</TemplateAsideDrawer>
      )}
    </>
  );
}
