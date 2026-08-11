"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { getPostTypeBySlug } from "@/lib/website-builder/post-types";
import {
  bodyToHtml,
  mapWizardToSlotOverrides,
  type WizardSlot,
} from "@/lib/website-builder/wizard-content";
import { createDraftPost } from "./create-draft";

// Sentinel used by the wizard for the "None (rich-text fallback)" choice.
// It has no template to render, so it's skipped when building preview
// overrides.
const NONE_ID = "__none__";

type VariantBlockRow = {
  id: string;
  is_locked?: boolean;
  block: { type_slug: string; content: unknown } | null;
};

/**
 * Load a template's DEFAULT variant's UNLOCKED slots as WizardSlots.
 * Returns [] when the template has no default variant (nothing to override).
 * is_locked is read defensively — if the column is missing we treat every
 * block as locked (no slots), matching TemplateRenderer's fallback.
 */
async function loadUnlockedSlots(
  sb: ReturnType<typeof supabaseServer>,
  templateId: string,
): Promise<WizardSlot[]> {
  const { data: variant } = await sb
    .from("page_template_variants")
    .select("id")
    .eq("page_template_id", templateId)
    .eq("is_default", true)
    .maybeSingle();
  if (!variant) return [];

  const withLock = await sb
    .from("page_template_variant_blocks")
    .select("id, is_locked, block:blocks(type_slug, content)")
    .eq("page_template_variant_id", variant.id)
    .order("sort_order");
  const rows: VariantBlockRow[] = withLock.error
    ? []
    : ((withLock.data ?? []) as unknown as VariantBlockRow[]);

  return rows
    .filter((r) => r.is_locked === false && r.block)
    .map((r) => ({
      variantBlockId: r.id,
      typeSlug: r.block!.type_slug,
      masterContent: r.block!.content,
    }));
}

/**
 * Build a preview draft for the Add-New-Post wizard.
 *
 * Creates ONE draft url_inventory row (cms_template_id left null for now —
 * the user picks the winning template later via bindTemplate). For every
 * selected REAL template it computes per-slot overrides from the pasted
 * content and upserts them into page_block_overrides keyed to the draft.
 *
 * Overrides for different templates never collide: each template's unlocked
 * slots have their own variant_block_ids, and the TemplateRenderer only ever
 * reads the ones belonging to the template it's rendering.
 *
 * Returns the draft id, which the wizard uses as `?page=` on the preview
 * route so the overrides apply.
 */
export async function buildPreview(args: {
  postTypeSlug: string;
  title: string;
  body: string;
  images: string[];
  selectedTemplateIds: string[];
  /** When set, reuse this draft (from a prior preview run) instead of
   *  inserting a new row — Back → Continue re-uses one draft rather than
   *  leaking orphan rows. Its title/body are refreshed and overrides
   *  re-upserted. */
  draftId?: string;
}): Promise<{ draftId: string }> {
  const pt = getPostTypeBySlug(args.postTypeSlug);
  if (!pt) throw new Error("Unknown post type");

  const bodyHtml = args.body.trim() === "" ? "" : bodyToHtml(args.body);
  const images = (args.images ?? []).filter(
    (u) => typeof u === "string" && u,
  );

  const sb = supabaseServer();
  const now = new Date().toISOString();

  let draftId: string;
  if (args.draftId) {
    // Reuse the existing draft — refresh its title + body in place (slug/url
    // stay stable). If the row vanished, fall through to a fresh insert.
    draftId = args.draftId;
    const { error: updErr } = await sb
      .from("url_inventory")
      .update({ title: args.title.trim() || null, date_modified: now })
      .eq("id", draftId);
    if (updErr) throw new Error(updErr.message);
    const cms_body_html = bodyHtml === "" ? null : bodyHtml;
    const { error: bodyErr } = await sb.from("content_items").upsert(
      { url_inventory_id: draftId, cms_body_html, cms_body_updated_at: now },
      { onConflict: "url_inventory_id" },
    );
    if (bodyErr) throw new Error(bodyErr.message);
  } else {
    draftId = await createDraftPost({
      postTypeSlug: args.postTypeSlug,
      title: args.title,
      body: args.body,
      cms_template_id: null,
    });
  }

  const realTemplateIds = args.selectedTemplateIds.filter(
    (id) => id && id !== NONE_ID,
  );

  for (const templateId of realTemplateIds) {
    const slots = await loadUnlockedSlots(sb, templateId);
    if (slots.length === 0) continue;

    const overrides = mapWizardToSlotOverrides(slots, {
      title: args.title.trim(),
      bodyHtml,
      images,
    });
    if (overrides.length === 0) continue;

    const rows = overrides.map((o) => ({
      url_inventory_id: draftId,
      variant_block_id: o.variantBlockId,
      content: o.content,
      updated_at: now,
    }));
    const { error } = await sb
      .from("page_block_overrides")
      .upsert(rows, { onConflict: "url_inventory_id,variant_block_id" });
    if (error) throw new Error(error.message);
  }

  return { draftId };
}

/**
 * Commit the user's chosen template onto the draft and revalidate the admin
 * list + the draft's editor. The wizard then redirects to the editor.
 */
export async function bindTemplate(
  draftId: string,
  templateId: string,
  postTypeSlug: string,
): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb
    .from("url_inventory")
    .update({ cms_template_id: templateId, date_modified: new Date().toISOString() })
    .eq("id", draftId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/website/${postTypeSlug}`);
  revalidatePath(`/admin/website/${postTypeSlug}/${draftId}`);
}
