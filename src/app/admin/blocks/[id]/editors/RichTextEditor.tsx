"use client";

import { useState } from "react";
import type { RichTextContent } from "@/types/blocks";

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
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
          HTML
        </span>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={16}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
