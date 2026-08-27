"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
} from "@/components/admin/blocks/BlockEditorChrome";
import type { OrgBranding } from "@/config/brand-tokens";
import type { TeacherRetreatsContent } from "@/types/blocks";
import { TeacherRetreatsForm, normalizeTeacherRetreats } from "./TeacherRetreatsEditorForm";

export default function TeacherUpcomingRetreatsEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: TeacherRetreatsContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<TeacherRetreatsContent>
      {...props}
      typeSlug="teacher_retreats_upcoming"
      normalize={(c) => normalizeTeacherRetreats(c, "Upcoming Retreats", "Register Now")}
      renderForm={(state) => <TeacherRetreatsForm state={state} />}
    />
  );
}
