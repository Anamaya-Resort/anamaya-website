import type { TeacherRetreatsContent } from "@/types/blocks";
import { fetchTeacherRetreats, resolvePersonIdForPage } from "@/lib/teacher-retreats";
import TeacherRetreatsSection from "./TeacherRetreatsSection";

/**
 * A retreat leader's upcoming retreats, live from AnamayOS. Renders
 * nothing at all when they have none scheduled -- an empty "Upcoming
 * Retreats" band would read as broken, not honest.
 *
 * On a real page (`pageId` set), the person ID ALWAYS comes from that
 * page's own Teacher Profile override, never from this block's own
 * content -- so every teacher page self-populates from one place (the
 * profile) instead of needing the ID re-entered on three blocks that
 * could drift out of sync. `content.ao_person_id` only matters with no
 * `pageId` (the abstract admin-preview iframe), where it drives the
 * shared block's own demo content.
 */
export default async function TeacherUpcomingRetreatsBlock({
  content,
  pageId,
}: {
  content: TeacherRetreatsContent;
  pageId?: string;
}) {
  const personId = pageId ? await resolvePersonIdForPage(pageId) : content?.ao_person_id;
  const retreats = await fetchTeacherRetreats(personId ?? undefined, "upcoming");
  if (retreats.length === 0) return null;
  return (
    <TeacherRetreatsSection
      content={content}
      retreats={retreats}
      defaultHeading="Upcoming Retreats"
      defaultRegisterLabel="Register Now"
    />
  );
}
