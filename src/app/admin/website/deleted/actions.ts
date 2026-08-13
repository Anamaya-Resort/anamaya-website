"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { POST_TYPES } from "@/lib/website-builder/post-types";

// Must match SOURCE_SITE in queries.ts — mutations stay scoped to the same
// site the reads come from.
const SOURCE_SITE = "v2";

/** Refresh the combined Deleted view plus every per-type list, since a
 *  restore/purge changes what those pages show. */
function revalidateAffected() {
  revalidatePath("/admin/website/deleted");
  for (const pt of POST_TYPES) revalidatePath(`/admin/website/${pt.slug}`);
}

/**
 * Restore trashed rows back to draft (type-agnostic — each row keeps its
 * own post_type). Guarded on wp_status='trash' so it only ever touches
 * rows that are actually in the trash.
 */
export async function bulkRestoreItems(ids: string[]) {
  if (!ids.length) return;

  const sb = supabaseServer();
  const { error } = await sb
    .from("url_inventory")
    .update({ wp_status: "draft", date_modified: new Date().toISOString() })
    .in("id", ids)
    .eq("source_site", SOURCE_SITE)
    .eq("wp_status", "trash");
  if (error) throw new Error(error.message);

  revalidateAffected();
}

/**
 * Permanently delete trashed rows (hard delete — irreversible).
 *
 * SAFETY: the .eq("wp_status", "trash") guard means a live row can never be
 * purged through this path, no matter what ids are passed.
 *
 * Child rows are removed automatically: every table that FK-references
 * url_inventory(id) — content_items, post_terms, page_tracking, page_faqs,
 * page_block_overrides, seo_meta (and the faq_sets meta table) — declares
 * ON DELETE CASCADE (verified against supabase/migrations; no non-cascading
 * reference exists). So deleting the parent row cascades to its children in
 * a single statement, and no explicit child-delete is needed.
 */
export async function bulkPurgeItems(ids: string[]) {
  if (!ids.length) return;

  const sb = supabaseServer();
  const { error } = await sb
    .from("url_inventory")
    .delete()
    .in("id", ids)
    .eq("source_site", SOURCE_SITE)
    .eq("wp_status", "trash");
  if (error) throw new Error(error.message);

  revalidateAffected();
}
