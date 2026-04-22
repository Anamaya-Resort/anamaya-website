import "server-only";
import { supabaseServerOrNull } from "./supabase-server";
import type { BlockRecord, BlockTypeSlug, BlockUsage } from "@/types/blocks";

/** All blocks placed on the given page_key, in sort order.
 *  Returns empty array if Supabase is unavailable or no blocks exist. */
export async function getBlocksForPage(pageKey: string): Promise<BlockUsage[]> {
  const sb = supabaseServerOrNull();
  if (!sb) return [];

  const { data, error } = await sb
    .from("block_usages")
    .select(
      "id, page_key, sort_order, override_content, blocks(id, type_slug, name, content)",
    )
    .eq("page_key", pageKey)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];

  return data.map((u: any) => ({
    id: u.id,
    page_key: u.page_key,
    sort_order: u.sort_order,
    block: u.blocks as BlockRecord,
    content: u.override_content ?? u.blocks?.content ?? {},
  }));
}

/** First block of a given type on the page, or null. Convenient when a
 *  template only expects one of a kind (e.g. one press_bar per page). */
export async function getBlockByType(
  pageKey: string,
  typeSlug: BlockTypeSlug,
): Promise<BlockUsage | null> {
  const all = await getBlocksForPage(pageKey);
  return all.find((u) => u.block?.type_slug === typeSlug) ?? null;
}
