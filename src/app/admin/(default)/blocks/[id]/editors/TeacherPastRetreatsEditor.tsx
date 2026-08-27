"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
} from "@/components/admin/blocks/BlockEditorChrome";
import type { OrgBranding } from "@/config/brand-tokens";
import type { TeacherRetreatsContent } from "@/types/blocks";
import { TeacherRetreatsForm, normalizeTeacherRetreats } from "./TeacherRetreatsEditorForm";

export default function TeacherPastRetreatsEditor(props: {
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
      typeSlug="teacher_retreats_past"
      normalize={(c) => normalizeTeacherRetreats(c, "Past Retreats", "View Retreat")}
      renderForm={(state) => <TeacherRetreatsForm state={state} />}
    />
  );
}
