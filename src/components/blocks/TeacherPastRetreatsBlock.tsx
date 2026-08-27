import type { TeacherRetreatsContent } from "@/types/blocks";
import { fetchTeacherRetreats, resolvePersonIdForPage } from "@/lib/teacher-retreats";
import TeacherRetreatsSection from "./TeacherRetreatsSection";

/**
 * A retreat leader's past retreats, live from AnamayOS. Renders nothing
 * at all when they have none yet (e.g. a brand-new teacher).
 *
 * Same page-derived person ID as TeacherUpcomingRetreatsBlock -- see
 * that file's doc comment for why `content.ao_person_id` is ignored
 * whenever a real `pageId` is present.
 */
export default async function TeacherPastRetreatsBlock({
  content,
  pageId,
}: {
  content: TeacherRetreatsContent;
  pageId?: string;
}) {
  const personId = pageId ? await resolvePersonIdForPage(pageId) : content?.ao_person_id;
  const retreats = await fetchTeacherRetreats(personId ?? undefined, "past");
  if (retreats.length === 0) return null;
  return (
    <TeacherRetreatsSection
      content={content}
      retreats={retreats}
      defaultHeading="Past Retreats"
      defaultRegisterLabel="View Retreat"
    />
  );
}
