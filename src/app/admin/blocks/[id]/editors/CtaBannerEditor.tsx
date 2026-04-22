"use client";

import { useState } from "react";
import type { CtaBannerContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";

export default function CtaBannerEditor({
  content,
  onSave,
}: {
  content: CtaBannerContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  const [state, setState] = useState<CtaBannerContent>(
    content ?? { heading: "", cta: { label: "", href: "" } },
  );
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
      className="grid grid-cols-1 gap-4 rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200"
    >
      <Field label="Heading">
        <input
          className={inputCls}
          value={state.heading}
          onChange={(e) => setState((s) => ({ ...s, heading: e.target.value }))}
        />
      </Field>
      <Field label="Subheading">
        <textarea
          rows={3}
          className={inputCls}
          value={state.subheading ?? ""}
          onChange={(e) => setState((s) => ({ ...s, subheading: e.target.value }))}
        />
      </Field>
      <Field label="Background image URL">
        <input
          className={inputCls}
          value={state.bg_image_url ?? ""}
          onChange={(e) => setState((s) => ({ ...s, bg_image_url: e.target.value }))}
        />
      </Field>
      <Field label="CTA button label">
        <input
          className={inputCls}
          value={state.cta?.label ?? ""}
          onChange={(e) =>
            setState((s) => ({ ...s, cta: { label: e.target.value, href: s.cta?.href ?? "" } }))
          }
        />
      </Field>
      <Field label="CTA href">
        <input
          className={inputCls}
          value={state.cta?.href ?? ""}
          onChange={(e) =>
            setState((s) => ({ ...s, cta: { label: s.cta?.label ?? "", href: e.target.value } }))
          }
        />
      </Field>
      <button
        type="submit"
        disabled={saving}
        className="justify-self-start rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
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
