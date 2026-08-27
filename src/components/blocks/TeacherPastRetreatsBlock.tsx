import type { TeacherRetreatsContent } from "@/types/blocks";
import { fetchTeacherRetreats } from "@/lib/teacher-retreats";
import TeacherRetreatsSection from "./TeacherRetreatsSection";

/**
 * A retreat leader's past retreats, live from AnamayOS. Renders nothing
 * at all when they have none yet (e.g. a brand-new teacher).
 */
export default async function TeacherPastRetreatsBlock({
  content,
}: {
  content: TeacherRetreatsContent;
}) {
  const retreats = await fetchTeacherRetreats(content?.ao_person_id, "past");
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
