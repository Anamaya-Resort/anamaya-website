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
