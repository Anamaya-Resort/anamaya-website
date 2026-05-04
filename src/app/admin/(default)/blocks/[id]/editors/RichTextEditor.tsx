"use client";

import { useState } from "react";
import { SaveButton } from "@/components/admin/blocks/BlockEditorChrome";
import type { RichTextContent } from "@/types/blocks";
import RTE from "@/components/admin/rte/RichTextEditor";

export default function RichTextEditor({
  content,
  onSave,
}: {
  content: RichTextContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  const [html, setHtml] = useState(content?.html ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <form
      action={async () => {
        setSaving(true);
        try {
          await onSave({ html });
        } finally {
          setSaving(false);
        }
      }}
      className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200"
    >
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
        Content
      </label>
      <RTE value={html} onChange={setHtml} placeholder="Write your content…" />
      <SaveButton saving={saving} className="mt-4" />
    </form>
  );
}
