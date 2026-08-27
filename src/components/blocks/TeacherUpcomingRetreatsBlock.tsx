import type { TeacherRetreatsContent } from "@/types/blocks";
import { fetchTeacherRetreats } from "@/lib/teacher-retreats";
import TeacherRetreatsSection from "./TeacherRetreatsSection";

/**
 * A retreat leader's upcoming retreats, live from AnamayOS. Renders
 * nothing at all when they have none scheduled -- an empty "Upcoming
 * Retreats" band would read as broken, not honest.
 */
export default async function TeacherUpcomingRetreatsBlock({
  content,
}: {
  content: TeacherRetreatsContent;
}) {
  const retreats = await fetchTeacherRetreats(content?.ao_person_id, "upcoming");
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
