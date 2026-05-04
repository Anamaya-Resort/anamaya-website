"use client";

import { useState } from "react";
import { SaveButton } from "@/components/admin/blocks/BlockEditorChrome";
import type { DividerContent } from "@/types/blocks";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";

export default function DividerEditor({
  content,
  onSave,
}: {
  content: DividerContent;
  onSave: (content: unknown) => Promise<void>;
}) {
  const [state, setState] = useState<DividerContent>(content ?? { variant: "rule" });
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
          value={state.variant ?? "rule"}
          onChange={(e) =>
            setState((s) => ({ ...s, variant: e.target.value as DividerContent["variant"] }))
          }
        >
          <option value="rule">Rule (horizontal line)</option>
          <option value="ornament">Ornament (image flourish)</option>
          <option value="spacer">Spacer (blank space)</option>
        </select>
      </Field>
      <Field label="Vertical spacing (px)">
        <input
          type="number"
          className={inputCls}
          value={state.spacing_px ?? 48}
          onChange={(e) => setState((s) => ({ ...s, spacing_px: Number(e.target.value) }))}
        />
      </Field>

      {state.variant !== "spacer" && (
        <Field label="Color (brand token key or hex)">
          <input
            className={inputCls}
            value={state.color ?? ""}
            onChange={(e) => setState((s) => ({ ...s, color: e.target.value }))}
            placeholder="brandDivider"
          />
        </Field>
      )}

      {state.variant === "ornament" && (
        <>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
                Ornament image
              </span>
              <ImageUploadButton
                value={state.ornament_url}
                onUploaded={(url) => setState((s) => ({ ...s, ornament_url: url }))}
                kind="dividers"
                maxWidth={400}
              />
            </div>
            {state.ornament_url && (
              <img src={state.ornament_url} alt="" className="h-12 w-auto" />
            )}
          </div>
          <Field label="Ornament max width (px)">
            <input
              type="number"
              className={inputCls}
              value={state.ornament_width_px ?? 80}
              onChange={(e) =>
                setState((s) => ({ ...s, ornament_width_px: Number(e.target.value) }))
              }
            />
          </Field>
        </>
      )}

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
