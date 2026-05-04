"use client";

import { useState } from "react";
import { SaveButton } from "@/components/admin/blocks/BlockEditorChrome";
import type { DateRangeContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";

export default function DateRangeEditor({
  content,
  onSave,
}: {
  content: DateRangeContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  const [state, setState] = useState<DateRangeContent>(content ?? {});
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
      <Field label="Label (optional)">
        <input
          className={inputCls}
          value={state.label ?? ""}
          onChange={(e) => setState((s) => ({ ...s, label: e.target.value }))}
          placeholder="Dates:"
        />
      </Field>
      <Field label="Alignment">
        <select
          className={inputCls}
          value={state.align ?? "center"}
          onChange={(e) =>
            setState((s) => ({ ...s, align: e.target.value as DateRangeContent["align"] }))
          }
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </Field>
      <Field label="Start date">
        <input
          type="date"
          className={inputCls}
          value={state.start_date ?? ""}
          onChange={(e) => setState((s) => ({ ...s, start_date: e.target.value }))}
        />
      </Field>
      <Field label="End date">
        <input
          type="date"
          className={inputCls}
          value={state.end_date ?? ""}
          onChange={(e) => setState((s) => ({ ...s, end_date: e.target.value }))}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Fallback text (used when dates are blank)">
          <input
            className={inputCls}
            value={state.fallback_text ?? ""}
            onChange={(e) => setState((s) => ({ ...s, fallback_text: e.target.value }))}
            placeholder="Custom dates available year-round"
          />
        </Field>
      </div>
      <Field label="Font size (px)">
        <input
          type="number"
          className={inputCls}
          value={state.size_px ?? 18}
          onChange={(e) => setState((s) => ({ ...s, size_px: Number(e.target.value) }))}
        />
      </Field>
      <Field label="Vertical padding (px)">
        <input
          type="number"
          className={inputCls}
          value={state.padding_y_px ?? 16}
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
