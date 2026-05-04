"use client";

import { useState } from "react";
import { SaveButton } from "@/components/admin/blocks/BlockEditorChrome";
import type { RawHtmlContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";

export default function RawHtmlEditor({
  content,
  onSave,
}: {
  content: RawHtmlContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  const [state, setState] = useState<RawHtmlContent>(content ?? { html: "" });
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
      className="grid grid-cols-1 gap-4 rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:grid-cols-2"
    >
      <p className="col-span-full rounded bg-amber-50 p-3 text-xs text-amber-800">
        ⚠ Raw HTML — content is rendered as-is. Sanitize before pasting; never
        embed scripts or untrusted markup. Prefer a typed block when the markup
        pattern repeats.
      </p>

      <div className="sm:col-span-2">
        <Field label="HTML">
          <textarea
            rows={16}
            className={`${inputCls} font-mono`}
            value={state.html}
            onChange={(e) => setState((s) => ({ ...s, html: e.target.value }))}
            placeholder="<div>…</div>"
          />
        </Field>
      </div>

      <Field label="Background color (brand token or hex)">
        <input
          className={inputCls}
          value={state.bg_color ?? ""}
          onChange={(e) => setState((s) => ({ ...s, bg_color: e.target.value }))}
        />
      </Field>
      <Field label="Vertical padding (px)">
        <input
          type="number"
          className={inputCls}
          value={state.padding_y_px ?? 32}
          onChange={(e) => setState((s) => ({ ...s, padding_y_px: Number(e.target.value) }))}
        />
      </Field>

      <SaveButton saving={saving} className="col-span-full justify-self-start" />
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
        {label}
      </span>
      {children}
    </label>
  );
}
