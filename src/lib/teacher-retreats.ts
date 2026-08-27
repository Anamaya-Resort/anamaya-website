import "server-only";
import { aoSupabaseAdminOrNull } from "@/lib/ao-supabase";
import type { RetreatCardData } from "@/components/blocks/RetreatCard";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
