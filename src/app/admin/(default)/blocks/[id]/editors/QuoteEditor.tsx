"use client";

import { useState } from "react";
import { SaveButton } from "@/components/admin/blocks/BlockEditorChrome";
import type { QuoteContent } from "@/types/blocks";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
import SectionFrameFieldset from "@/components/admin/blocks/SectionFrameFieldset";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";

export default function QuoteEditor({
  content,
  onSave,
}: {
  content: QuoteContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  const [state, setState] = useState<QuoteContent>(content ?? { quote: "", variant: "pull" });
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
      <Field label="Variant">
        <select
          className={inputCls}
          value={state.variant ?? "pull"}
          onChange={(e) =>
            setState((s) => ({ ...s, variant: e.target.value as QuoteContent["variant"] }))
          }
        >
          <option value="pull">Pull-quote (centered)</option>
          <option value="card">Card (with side photo)</option>
          <option value="banner">Banner (full-width)</option>
        </select>
      </Field>
      <Field label="Background color (brand token or hex)">
        <input
          className={inputCls}
          value={state.bg_color ?? ""}
          onChange={(e) => setState((s) => ({ ...s, bg_color: e.target.value }))}
          placeholder="brandSubtle"
        />
      </Field>

      <div className="sm:col-span-2">
        <Field label="Quote">
          <textarea
            rows={3}
            className={inputCls}
            value={state.quote}
            onChange={(e) => setState((s) => ({ ...s, quote: e.target.value }))}
          />
        </Field>
      </div>

      <Field label="Attribution (name)">
        <input
          className={inputCls}
          value={state.attribution ?? ""}
          onChange={(e) => setState((s) => ({ ...s, attribution: e.target.value }))}
        />
      </Field>
      <Field label="Attribution role">
        <input
          className={inputCls}
          value={state.attribution_role ?? ""}
          onChange={(e) => setState((s) => ({ ...s, attribution_role: e.target.value }))}
          placeholder="e.g. Yoga teacher, NYC"
        />
      </Field>

      {state.variant === "card" && (
        <div className="sm:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
              Photo
            </span>
            <ImageUploadButton
              value={state.photo_url}
              onUploaded={(url) => setState((s) => ({ ...s, photo_url: url }))}
              kind="quotes"
              maxWidth={400}
            />
          </div>
          {state.photo_url && (
            <img src={state.photo_url} alt="" className="h-20 w-20 rounded-full object-cover" />
          )}
        </div>
      )}

      <div className="sm:col-span-2">
        <SectionFrameFieldset
          frame={state}
          onChange={(u) => setState((s) => ({ ...s, ...u }))}
          defaultWidth={900}
        />
      </div>

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
