"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { POST_TYPES } from "@/lib/website-builder/post-types";
import {
  cloneAsVariant,
  countVariants,
  variantLabel,
} from "@/lib/website-builder/split-testing";

const SOURCE_SITE = "v2";

function slugForType(postType: string): string | null {
  return POST_TYPES.find((p) => p.postType === postType)?.slug ?? null;
}

/** Refresh the panel plus every per-type list (membership changes ripple). */
function revalidateAll() {
  revalidatePath("/admin/website/split-testing");
  for (const pt of POST_TYPES) revalidatePath(`/admin/website/${pt.slug}`);
}

type Sb = ReturnType<typeof supabaseServer>;

async function findControlId(sb: Sb, groupId: string): Promise<string | null> {
  const { data } = await sb
    .from("url_inventory")
    .select("id")
    .eq("split_group_id", groupId)
    .is("split_variant_of", null)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

async function clearMembership(sb: Sb, ids: string[]) {
  if (!ids.length) return;
  const { error } = await sb
    .from("url_inventory")
    .update({
      split_group_id: null,
      split_variant_of: null,
      split_label: null,
      split_weight: 1,
    })
    .in("id", ids);
  if (error) throw new Error(error.message);
}

/**
 * Create a new test group from selected list rows. The first selected item
 * becomes the control ("Original"); the rest become variants. Items already
 * in a group are skipped.
 */
export async function makeTestGroupFromIds(
  name: string,
  ids: string[],
): Promise<{ groupId: string; added: number }> {
  const sb = supabaseServer();
  const unique = [...new Set(ids)];
  if (!unique.length) throw new Error("Nothing selected.");

  const { data: rows, error } = await sb
    .from("url_inventory")
    .select("id, split_group_id")
    .in("id", unique)
    .eq("source_site", SOURCE_SITE);
  if (error) throw new Error(error.message);

  // Preserve the user's selection order, keep only ungrouped items.
  const free = unique.filter((id) =>
    (rows ?? []).some((r) => r.id === id && !r.split_group_id),
  );
  if (!free.length)
    throw new Error("Those items are already in a test group.");

  const groupName = name.trim() || "Untitled test";
  const { data: group, error: gErr } = await sb
    .from("split_test_groups")
    .insert({ name: groupName, source_site: SOURCE_SITE })
    .select("id")
    .single();
  if (gErr) throw new Error(gErr.message);
  const groupId = group.id as string;

  const [controlId, ...variantIds] = free;
  const { error: cErr } = await sb
    .from("url_inventory")
    .update({
      split_group_id: groupId,
      split_variant_of: null,
      split_label: "Original",
      split_weight: 1,
    })
    .eq("id", controlId);
  if (cErr) throw new Error(cErr.message);

  for (let i = 0; i < variantIds.length; i++) {
    const { error: vErr } = await sb
      .from("url_inventory")
      .update({
        split_group_id: groupId,
        split_variant_of: controlId,
        split_label: variantLabel(i),
        split_weight: 1,
      })
      .eq("id", variantIds[i]);
    if (vErr) throw new Error(vErr.message);
  }

  revalidateAll();
  return { groupId, added: free.length };
}

/** Create a new, empty test group (the first page added becomes the original). */
export async function createEmptyGroup(name: string): Promise<{ groupId: string }> {
  const sb = supabaseServer();
  const { data: group, error } = await sb
    .from("split_test_groups")
    .insert({ name: name.trim() || "Untitled test", source_site: SOURCE_SITE })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidateAll();
  return { groupId: group.id as string };
}

/**
 * Add an existing article to an existing group. If the group has no original
 * yet (a fresh empty group), this article becomes the original; otherwise it
 * is added as a variant.
 */
export async function addArticleToGroup(
  articleId: string,
  groupId: string,
): Promise<void> {
  const sb = supabaseServer();

  const { data: art } = await sb
    .from("url_inventory")
    .select("id, split_group_id")
    .eq("id", articleId)
    .maybeSingle();
  if (!art) throw new Error("Article not found.");
  if (art.split_group_id) throw new Error("Already in a test group.");

  const controlId = await findControlId(sb, groupId);
  const update = controlId
    ? {
        split_group_id: groupId,
        split_variant_of: controlId,
        split_label: variantLabel(await countVariants(groupId)),
        split_weight: 1,
      }
    : {
        split_group_id: groupId,
        split_variant_of: null,
        split_label: "Original",
        split_weight: 1,
      };
  const { error } = await sb
    .from("url_inventory")
    .update(update)
    .eq("id", articleId);
  if (error) throw new Error(error.message);

  revalidateAll();
}

/**
 * Clone the group's ORIGINAL into a new draft variant and return where to
 * edit it. If the article isn't in a group yet, a new group is created with
 * this article as the control first.
 */
export async function makeTestVariant(
  articleId: string,
): Promise<{ variantId: string; editHref: string | null }> {
  const sb = supabaseServer();

  const { data: art } = await sb
    .from("url_inventory")
    .select("id, post_type, title, split_group_id, split_variant_of")
    .eq("id", articleId)
    .maybeSingle();
  if (!art) throw new Error("Article not found.");

  let groupId = art.split_group_id as string | null;
  let controlId: string;

  if (groupId) {
    controlId = (art.split_variant_of as string | null) ?? (art.id as string);
  } else {
    const { data: group, error: gErr } = await sb
      .from("split_test_groups")
      .insert({
        name: (art.title as string | null)?.trim() || "Untitled test",
        source_site: SOURCE_SITE,
      })
      .select("id")
      .single();
    if (gErr) throw new Error(gErr.message);
    groupId = group.id as string;
    controlId = art.id as string;
    const { error: cErr } = await sb
      .from("url_inventory")
      .update({
        split_group_id: groupId,
        split_variant_of: null,
        split_label: "Original",
        split_weight: 1,
      })
      .eq("id", controlId);
    if (cErr) throw new Error(cErr.message);
  }

  const label = variantLabel(await countVariants(groupId));
  const variantId = await cloneAsVariant({
    sourceId: controlId,
    groupId,
    controlId,
    label,
  });

  revalidateAll();
  const slug = slugForType(art.post_type as string);
  return {
    variantId,
    editHref: slug ? `/admin/website/${slug}/${variantId}` : null,
  };
}

/**
 * Remove an article from its group. Removing the control dissolves the whole
 * group (all members become standalone again; the pages themselves are kept).
 */
export async function removeFromTestGroup(articleId: string): Promise<void> {
  const sb = supabaseServer();
  const { data: art } = await sb
    .from("url_inventory")
    .select("id, split_group_id, split_variant_of")
    .eq("id", articleId)
    .maybeSingle();
  if (!art?.split_group_id) return;

  if (!art.split_variant_of) {
    await dissolveGroup(art.split_group_id as string);
  } else {
    await clearMembership(sb, [articleId]);
    revalidateAll();
  }
}

async function dissolveGroup(groupId: string): Promise<void> {
  const sb = supabaseServer();
  const { data: members } = await sb
    .from("url_inventory")
    .select("id")
    .eq("split_group_id", groupId);
  await clearMembership(sb, (members ?? []).map((m) => m.id as string));
  await sb.from("split_test_groups").delete().eq("id", groupId);
  revalidateAll();
}

export async function deleteGroup(groupId: string): Promise<void> {
  await dissolveGroup(groupId);
}

export async function setGroupStatus(
  groupId: string,
  status: "running" | "paused" | "ended",
): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb
    .from("split_test_groups")
    .update({ status })
    .eq("id", groupId);
  if (error) throw new Error(error.message);
  revalidateAll();
}

export async function renameGroup(
  groupId: string,
  name: string,
): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb
    .from("split_test_groups")
    .update({ name: name.trim() || "Untitled test" })
    .eq("id", groupId);
  if (error) throw new Error(error.message);
  revalidateAll();
}
