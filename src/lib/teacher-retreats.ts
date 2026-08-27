import "server-only";
import { aoSupabaseAdminOrNull } from "@/lib/ao-supabase";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import type { RetreatCardData } from "@/components/blocks/RetreatCard";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type VariantBlockWithType = { id: string; block: { type_slug: string } | { type_slug: string }[] | null };

/**
 * The AnamayOS person ID that a page's Teacher Profile block resolves to
 * (its per-page override, if the page has one) -- the single source of
 * truth this page's teacher-retreats blocks should follow, so the admin
 * only ever has to set one ID per page instead of one per block.
 *
 * Deliberately does NOT fall back to the profile block's own (shared,
 * master) content -- that master content is placeholder/demo data
 * (see 0073's migration comment), and a real page with no override yet
 * should show nothing, never a stranger's data.
 */
export async function resolvePersonIdForPage(pageId: string): Promise<string | null> {
  const sb = supabaseServerOrNull();
  if (!sb) return null;

  const { data: page } = await sb
    .from("url_inventory")
    .select("cms_template_id")
    .eq("id", pageId)
    .maybeSingle();
  const templateId = page?.cms_template_id;
  if (!templateId) return null;

  const { data: variant } = await sb
    .from("page_template_variants")
    .select("id")
    .eq("page_template_id", templateId)
    .eq("is_default", true)
    .maybeSingle();
  if (!variant) return null;

  const { data: variantBlocks } = await sb
    .from("page_template_variant_blocks")
    .select("id, block:blocks(type_slug)")
    .eq("page_template_variant_id", variant.id)
    .order("sort_order");
  const profileRow = ((variantBlocks ?? []) as VariantBlockWithType[]).find((r) => {
    const b = Array.isArray(r.block) ? r.block[0] : r.block;
    return b?.type_slug === "teacher_profile";
  });
  if (!profileRow) return null;

  const { data: override } = await sb
    .from("page_block_overrides")
    .select("content")
    .eq("variant_block_id", profileRow.id)
    .eq("url_inventory_id", pageId)
    .maybeSingle();
  const id = (override?.content as { ao_person_id?: string } | null)?.ao_person_id;
  return id && id.trim() ? id.trim() : null;
}

const RETREAT_COLS =
  "id, name, excerpt, description, start_date, end_date, feature_image_url, images, website_slug, registration_link, external_link";

/**
 * A teacher's retreats from AnamayOS, in either direction. "Belongs to"
 * means either the direct `retreats.leader_person_id` FK or a
 * `retreat_teachers` row (co-teachers) -- checked with two queries and
 * merged, mirroring FeaturedRetreatsBlock's featured+backfill pattern,
 * since Supabase's query builder doesn't do an OR-with-subquery cleanly.
 *
 * Upcoming = end_date today-or-later, soonest first. Past = end_date
 * before today, most recent first. Silent on any AO failure -- callers
 * treat an empty array as "nothing to show," not an error.
 */
export async function fetchTeacherRetreats(
  personId: string | undefined,
  direction: "upcoming" | "past",
): Promise<RetreatCardData[]> {
  const id = personId?.trim();
  if (!id || !UUID_RE.test(id)) return [];
  const ao = aoSupabaseAdminOrNull();
  if (!ao) return [];

  const { data: teacherRows } = await ao
    .from("retreat_teachers")
    .select("retreat_id")
    .eq("person_id", id);
  const coTaughtIds = (teacherRows ?? [])
    .map((r) => r.retreat_id as string)
    .filter(Boolean);

  const orParts = [`leader_person_id.eq.${id}`];
  if (coTaughtIds.length > 0) orParts.push(`id.in.(${coTaughtIds.join(",")})`);

  const today = new Date().toISOString().slice(0, 10);
  let query = ao
    .from("retreats")
    .select(RETREAT_COLS)
    .eq("is_public", true)
    .eq("is_active", true)
    .or(orParts.join(","));

  query =
    direction === "upcoming"
      ? query.gte("end_date", today).order("start_date", { ascending: true })
      : query.lt("end_date", today).order("start_date", { ascending: false });

  const { data, error } = await query.limit(50);
  if (error || !data) return [];
  return data as RetreatCardData[];
}
