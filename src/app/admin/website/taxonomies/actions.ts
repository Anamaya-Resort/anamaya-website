"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";

// Staging source. All writes are scoped to this WP mirror.
const SOURCE_SITE = "v2";

type TermType = "category" | "post_tag";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Lowercase, spaces/underscores→hyphens, strip non [a-z0-9-], collapse, trim. */
function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Revalidate every surface that reads category/tag data. */
function revalidateAll(): void {
  revalidatePath("/admin/website/taxonomies");
  revalidatePath("/tags");
  revalidatePath("/blog-posts");
}

export async function renameTerm(
  id: string,
  name: string,
  slug: string,
): Promise<ActionResult> {
  try {
    if (!id) return { ok: false, error: "Missing id" };
    const trimmedName = name.trim();
    if (!trimmedName) return { ok: false, error: "Name is required" };
    // Slugify the given slug; if blank, derive from the name.
    let finalSlug = slugify(slug);
    if (!finalSlug) finalSlug = slugify(trimmedName);
    if (!finalSlug) return { ok: false, error: "Could not derive a slug" };

    const sb = supabaseServer();
    const { error } = await sb
      .from("taxonomy_terms")
      .update({ name: trimmedName, slug: finalSlug })
      .eq("id", id)
      .eq("source_site", SOURCE_SITE);
    if (error) return { ok: false, error: error.message };

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function setTermType(
  id: string,
  taxonomy: TermType,
): Promise<ActionResult> {
  try {
    if (!id) return { ok: false, error: "Missing id" };
    if (taxonomy !== "category" && taxonomy !== "post_tag") {
      return { ok: false, error: "Invalid type" };
    }

    const sb = supabaseServer();
    const { error } = await sb
      .from("taxonomy_terms")
      .update({ taxonomy })
      .eq("id", id)
      .eq("source_site", SOURCE_SITE);
    if (error) return { ok: false, error: error.message };

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function deleteTerm(id: string): Promise<ActionResult> {
  try {
    if (!id) return { ok: false, error: "Missing id" };

    const sb = supabaseServer();
    // post_terms rows cascade automatically (FK ON DELETE CASCADE).
    const { error } = await sb
      .from("taxonomy_terms")
      .delete()
      .eq("id", id)
      .eq("source_site", SOURCE_SITE);
    if (error) return { ok: false, error: error.message };

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function createTerm(
  name: string,
  taxonomy: TermType,
): Promise<ActionResult> {
  try {
    const trimmedName = name.trim();
    if (!trimmedName) return { ok: false, error: "Name is required" };
    if (taxonomy !== "category" && taxonomy !== "post_tag") {
      return { ok: false, error: "Invalid type" };
    }
    const slug = slugify(trimmedName);
    if (!slug) return { ok: false, error: "Could not derive a slug" };

    const sb = supabaseServer();

    // Synthesize a NEGATIVE wp_id so we never collide with positive
    // WP-origin ids. Take one below the current minimum (or 0).
    const { data: minRow } = await sb
      .from("taxonomy_terms")
      .select("wp_id")
      .eq("source_site", SOURCE_SITE)
      .eq("taxonomy", taxonomy)
      .order("wp_id", { ascending: true })
      .limit(1)
      .maybeSingle();
    const existingMin =
      (minRow as { wp_id: number | null } | null)?.wp_id ?? 0;
    const wp_id = Math.min(existingMin, 0) - 1;

    const { error } = await sb.from("taxonomy_terms").insert({
      source_site: SOURCE_SITE,
      taxonomy,
      wp_id,
      name: trimmedName,
      slug,
      meta: {},
    });
    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: `"${trimmedName}" already exists` };
      }
      return { ok: false, error: error.message };
    }

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function mergeTerm(
  sourceId: string,
  targetId: string,
): Promise<ActionResult> {
  try {
    if (!sourceId || !targetId) return { ok: false, error: "Missing id" };
    if (sourceId === targetId) {
      return { ok: false, error: "Cannot merge a term into itself" };
    }

    const sb = supabaseServer();

    // 2) Posts already carrying the TARGET term.
    const { data: targetLinks, error: tErr } = await sb
      .from("post_terms")
      .select("url_inventory_id")
      .eq("taxonomy_term_id", targetId);
    if (tErr) return { ok: false, error: tErr.message };
    const targetPostIds = new Set(
      ((targetLinks ?? []) as { url_inventory_id: string }[]).map(
        (r) => r.url_inventory_id,
      ),
    );

    // 3) Posts carrying the SOURCE term.
    const { data: sourceLinks, error: sErr } = await sb
      .from("post_terms")
      .select("url_inventory_id")
      .eq("taxonomy_term_id", sourceId);
    if (sErr) return { ok: false, error: sErr.message };
    const sourcePostIds = (
      (sourceLinks ?? []) as { url_inventory_id: string }[]
    ).map((r) => r.url_inventory_id);

    // 4 & 5) Fold each source link into the target.
    for (const postId of sourcePostIds) {
      if (targetPostIds.has(postId)) {
        // Would duplicate the composite PK on target — drop the source link.
        const { error } = await sb
          .from("post_terms")
          .delete()
          .eq("url_inventory_id", postId)
          .eq("taxonomy_term_id", sourceId);
        if (error) return { ok: false, error: error.message };
      } else {
        // Re-point the source link to the target term.
        const { error } = await sb
          .from("post_terms")
          .update({ taxonomy_term_id: targetId })
          .eq("url_inventory_id", postId)
          .eq("taxonomy_term_id", sourceId);
        if (error) return { ok: false, error: error.message };
      }
    }

    // 6) Remove the now-empty source term.
    const { error: delErr } = await sb
      .from("taxonomy_terms")
      .delete()
      .eq("id", sourceId)
      .eq("source_site", SOURCE_SITE);
    if (delErr) return { ok: false, error: delErr.message };

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
