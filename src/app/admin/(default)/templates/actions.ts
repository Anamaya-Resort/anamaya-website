"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

// Table names below map to migration 0013 (page_templates etc.) — the
// original 'templates' name collides with a pre-existing WP-discovery
// table from migration 0001.

/** Rename a page template (the human-readable label). */
export async function renameTemplate(id: string, name: string) {
  const sb = supabaseServer();
  const { error } = await sb.from("page_templates").update({ name }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/templates");
  revalidatePath(`/admin/templates/${id}`);
}

/** Update a page template's slug. Slug is normalised to lowercase
 *  letters/numbers/dashes/underscores. Caller is responsible for
 *  uniqueness — the DB has a unique index on slug and will reject
 *  duplicates. */
export async function updateTemplateSlug(id: string, slug: string) {
  const sb = supabaseServer();
  const cleaned = slug
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/gi, "")
    .toLowerCase();
  if (!cleaned) throw new Error("Slug cannot be empty");
  const { error } = await sb.from("page_templates").update({ slug: cleaned }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/templates");
  revalidatePath(`/admin/templates/${id}`);
  revalidatePath("/", "layout");
}

/** Form-friendly wrappers so an inline form on the template editor
 *  page can submit name / slug edits without callers needing to bind
 *  the id at construction time. Both expect a hidden `id` input plus
 *  the relevant value field. */
export async function renameTemplateFromForm(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  await renameTemplate(id, name);
}
export async function updateTemplateSlugFromForm(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!id || !slug) return;
  await updateTemplateSlug(id, slug);
}

/** Update a single variant's slug. Used by the inline editor on
 *  /admin/templates/<id> where we surface the variant slug as the
 *  template's working slug (e.g. home_v1). The variant slug is
 *  unique within its template, so collisions on the same template
 *  are rejected by the DB. */
export async function updateVariantSlugFromForm(formData: FormData) {
  const variantId = String(formData.get("variant_id") ?? "").trim();
  const templateId = String(formData.get("template_id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!variantId || !slug) return;
  const cleaned = slug
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/gi, "")
    .toLowerCase();
  if (!cleaned) throw new Error("Slug cannot be empty");
  const sb = supabaseServer();
  const { error } = await sb
    .from("page_template_variants")
    .update({ slug: cleaned })
    .eq("id", variantId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/templates");
  if (templateId) revalidatePath(`/admin/templates/${templateId}`);
  revalidatePath("/", "layout");
}

/**
 * Delete a template. Cascades to variants and variant_blocks via the FK
 * definitions in migration 0013. Block rows themselves are untouched —
 * only the template and its variant/block references go.
 */
export async function deleteTemplate(id: string) {
  const sb = supabaseServer();
  const { error } = await sb.from("page_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/templates");
  revalidatePath("/", "layout");
}

/**
 * Duplicate a template: copies the template row, every variant, and every
 * variant-block reference. Block rows themselves are shared (templates
 * reference the same blocks). Returns the new template id.
 */
export async function duplicateTemplate(id: string): Promise<string> {
  const sb = supabaseServer();

  const { data: source, error: sErr } = await sb
    .from("page_templates")
    .select("slug, name")
    .eq("id", id)
    .maybeSingle();
  if (sErr || !source) throw new Error("Source template not found");

  // Pick a unique slug.
  const newSlug = await nextAvailableTemplateSlug(source.slug);

  const { data: newTpl, error: tErr } = await sb
    .from("page_templates")
    .insert({ slug: newSlug, name: `${source.name} (copy)` })
    .select("id")
    .single();
  if (tErr) throw new Error(tErr.message);

  // Copy variants + their block references.
  const { data: variants } = await sb
    .from("page_template_variants")
    .select("id, slug, name, is_default")
    .eq("page_template_id", id);

  for (const v of variants ?? []) {
    const newVariantSlug = v.slug.replace(source.slug, newSlug);
    const { data: newVar, error: vErr } = await sb
      .from("page_template_variants")
      .insert({
        page_template_id: newTpl.id,
        slug: newVariantSlug,
        name: v.name,
        is_default: v.is_default,
      })
      .select("id")
      .single();
    if (vErr) throw new Error(vErr.message);

    const { data: blocks } = await sb
      .from("page_template_variant_blocks")
      .select("block_id, sort_order")
      .eq("page_template_variant_id", v.id);
    if (blocks && blocks.length > 0) {
      const rows = blocks.map((b) => ({
        page_template_variant_id: newVar.id,
        block_id: b.block_id,
        sort_order: b.sort_order,
      }));
      await sb.from("page_template_variant_blocks").insert(rows);
    }
  }

  revalidatePath("/admin/templates");
  return newTpl.id;
}

async function nextAvailableTemplateSlug(baseSlug: string): Promise<string> {
  const sb = supabaseServer();
  const { data } = await sb.from("page_templates").select("slug");
  const used = new Set((data ?? []).map((r) => r.slug));
  let candidate = `${baseSlug}-copy`;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${baseSlug}-copy-${n}`;
    n++;
  }
  return candidate;
}

/** Create a new empty page template + default variant. Returns the template id. */
export async function createTemplate(slug: string, name: string): Promise<string> {
  const sb = supabaseServer();
  const cleanSlug =
    slug.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") ||
    `template-${Date.now()}`;
  const { data, error } = await sb
    .from("page_templates")
    .insert({ slug: cleanSlug, name })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await sb.from("page_template_variants").insert({
    page_template_id: data.id,
    slug: `${cleanSlug}_v1`,
    name: `${name} V1 (default)`,
    is_default: true,
  });
  revalidatePath("/admin/templates");
  return data.id;
}

/** Add a block to a variant at the end of the existing order. */
export async function appendBlockToVariant(
  variantId: string,
  blockId: string,
): Promise<void> {
  const sb = supabaseServer();
  const { data: last } = await sb
    .from("page_template_variant_blocks")
    .select("sort_order")
    .eq("page_template_variant_id", variantId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.sort_order ?? 0) + 10;
  const { error } = await sb.from("page_template_variant_blocks").insert({
    page_template_variant_id: variantId,
    block_id: blockId,
    sort_order: nextOrder,
  });
  if (error) throw new Error(error.message);
  await bumpAndRevalidate(variantId);
}

/** Insert a block just before an existing row in the variant's order. */
export async function insertBlockBefore(
  variantId: string,
  targetRowId: string,
  blockId: string,
): Promise<void> {
  const sb = supabaseServer();
  const { data: target } = await sb
    .from("page_template_variant_blocks")
    .select("sort_order")
    .eq("id", targetRowId)
    .maybeSingle();
  if (!target) throw new Error("Insert target not found");
  const { data: prev } = await sb
    .from("page_template_variant_blocks")
    .select("sort_order")
    .eq("page_template_variant_id", variantId)
    .lt("sort_order", target.sort_order)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const prevOrder = prev?.sort_order ?? 0;
  const newOrder = (prevOrder + target.sort_order) / 2;
  const { error } = await sb.from("page_template_variant_blocks").insert({
    page_template_variant_id: variantId,
    block_id: blockId,
    sort_order: newOrder,
  });
  if (error) throw new Error(error.message);
  await bumpAndRevalidate(variantId);
}

/** Remove a block from a variant (deletes the join row, not the block). */
export async function removeBlockFromVariant(rowId: string): Promise<void> {
  const sb = supabaseServer();
  const { data: row } = await sb
    .from("page_template_variant_blocks")
    .select("page_template_variant_id")
    .eq("id", rowId)
    .maybeSingle();
  const { error } = await sb.from("page_template_variant_blocks").delete().eq("id", rowId);
  if (error) throw new Error(error.message);
  if (row) await bumpAndRevalidate(row.page_template_variant_id);
}

/** Move a block one slot up or down in its variant. */
export async function moveBlockInVariant(rowId: string, delta: -1 | 1): Promise<void> {
  const sb = supabaseServer();
  const { data: row } = await sb
    .from("page_template_variant_blocks")
    .select("id, page_template_variant_id, sort_order")
    .eq("id", rowId)
    .maybeSingle();
  if (!row) throw new Error("Row not found");
  const neighbor = await sb
    .from("page_template_variant_blocks")
    .select("id, sort_order")
    .eq("page_template_variant_id", row.page_template_variant_id)
    [delta > 0 ? "gt" : "lt"]("sort_order", row.sort_order)
    .order("sort_order", { ascending: delta > 0 })
    .limit(1)
    .maybeSingle();
  if (!neighbor.data) return;
  await sb
    .from("page_template_variant_blocks")
    .update({ sort_order: row.sort_order })
    .eq("id", neighbor.data.id);
  await sb
    .from("page_template_variant_blocks")
    .update({ sort_order: neighbor.data.sort_order })
    .eq("id", row.id);
  await bumpAndRevalidate(row.page_template_variant_id);
}

/**
 * Patch the three overlay structural fields (anchor / trigger / z) on
 * a block's content. Used by the template-builder gutter for inline
 * editing — it's a targeted JSONB merge so we don't have to round-trip
 * the entire block content (and trigger BlockEditorChrome's snapshot
 * capture, which is owned by the dedicated block-editor page).
 *
 * Mutation scope is the master block — ALL templates that use this
 * block see the change. That matches how every other block edit
 * already works; per-template overrides go through block_usages.
 */
export async function updateBlockOverlayFields(
  blockId: string,
  patch: {
    overlay_anchor?: "top" | "right" | "bottom" | "left" | "fullscreen";
    overlay_trigger?: "always" | "on-menu" | "on-scroll";
    overlay_z?: number;
  },
): Promise<void> {
  const sb = supabaseServer();
  const { data: row, error: rErr } = await sb
    .from("blocks")
    .select("content")
    .eq("id", blockId)
    .maybeSingle();
  if (rErr) throw new Error(rErr.message);
  if (!row) throw new Error("Block not found");

  const current = (row.content ?? {}) as Record<string, unknown>;
  const next: Record<string, unknown> = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    next[k] = v;
  }

  const { error: uErr } = await sb.from("blocks").update({ content: next }).eq("id", blockId);
  if (uErr) throw new Error(uErr.message);

  // Chrome blocks render on every public page via the site_chrome
  // template — invalidate the whole site layout so visitors get the
  // new value on the next request.
  revalidatePath("/admin/templates", "layout");
  revalidatePath("/admin/blocks");
  revalidatePath("/", "layout");
}

/**
 * Toggle the lock state of a single block within a template variant.
 *
 * Locked  = the master block content always renders (template-shared).
 * Unlocked = pages using this template can supply per-page content via
 * page_block_overrides; if no override exists, the master still renders.
 *
 * Toggling does NOT touch existing override rows — flipping a slot
 * locked → unlocked → locked preserves any authored per-page values
 * (they're just ignored while the slot is locked).
 */
export async function setBlockLocked(
  rowId: string,
  locked: boolean,
): Promise<void> {
  const sb = supabaseServer();
  const { data: row, error: rErr } = await sb
    .from("page_template_variant_blocks")
    .select("page_template_variant_id")
    .eq("id", rowId)
    .maybeSingle();
  if (rErr) throw new Error(rErr.message);
  if (!row) throw new Error("Variant block row not found");

  const { error: uErr } = await sb
    .from("page_template_variant_blocks")
    .update({ is_locked: locked })
    .eq("id", rowId);
  if (uErr) throw new Error(uErr.message);

  await bumpAndRevalidate(row.page_template_variant_id);
  // The lock state affects every page using this template, so blow
  // away the public layout cache.
  revalidatePath("/", "layout");
}

async function bumpAndRevalidate(variantId: string) {
  const sb = supabaseServer();
  const { data } = await sb
    .from("page_template_variants")
    .select("page_template_id")
    .eq("id", variantId)
    .maybeSingle();
  revalidatePath("/admin/templates");
  if (data?.page_template_id) revalidatePath(`/admin/templates/${data.page_template_id}`);
  revalidatePath("/", "layout");
}
