import { supabaseServerOrNull } from "@/lib/supabase-server";
import renderBlockByType from "@/components/blocks/renderBlockByType";

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

  const variantQuery = sb
    .from("page_template_variants")
    .select("id")
    .eq("page_template_id", templateRowId);
  const { data: variant } = await (variantSlug
    ? variantQuery.eq("slug", variantSlug).maybeSingle()
    : variantQuery.eq("is_default", true).maybeSingle());
  if (!variant) {
    return (
      <div className="mx-auto my-6 max-w-xl rounded border border-dashed border-zinc-300 px-4 py-3 text-sm italic text-anamaya-charcoal/60">
        No default variant for template <code>{templateLabel}</code>.
      </div>
    );
  }

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

  return (
    <>
      {blocks.map((row) => {
        if (!row.block) return null;
        const isLocked = row.is_locked !== false;
        const content =
          !isLocked && overrides.has(row.id)
            ? overrides.get(row.id)
            : row.block.content;
        return (
          <div key={row.id}>
            {renderBlockByType(row.block.type_slug, content)}
          </div>
        );
      })}
    </>
  );
}
