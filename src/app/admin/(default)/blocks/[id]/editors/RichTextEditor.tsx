"use client";

import { useState } from "react";
import { SaveButton } from "@/components/admin/blocks/BlockEditorChrome";
import type { RichTextContent } from "@/types/blocks";
import RTE from "@/components/admin/rte/RichTextEditor";
import LayoutWidthsFieldset from "@/components/admin/blocks/LayoutWidthsFieldset";

export default function RichTextEditor({
  content,
  onSave,
}: {
  content: RichTextContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  const [state, setState] = useState<RichTextContent>(content ?? { html: "" });
  const [saving, setSaving] = useState(false);

  return (
    <form
      action={async () => {
        setSaving(true);
        try {
          await onSave(state);
        } finally {
          setSaving(false);
        }
      }}
      className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200"
    >
      {/* Layout widths — first, right under the live preview. */}
      <div className="mb-4">
        <LayoutWidthsFieldset
          values={state}
          onPatch={(u) => setState((s) => ({ ...s, ...u }))}
          maxContentDefault={state.content_width_px ?? 0}
        />
      </div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
        Content
      </label>
      <RTE
        value={state.html ?? ""}
        onChange={(v) => setState((s) => ({ ...s, html: v }))}
        placeholder="Write your content…"
      />
      <SaveButton saving={saving} className="mt-4" />
    </form>
  );
}
