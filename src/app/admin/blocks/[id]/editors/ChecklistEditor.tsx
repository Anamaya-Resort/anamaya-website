"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import BrandFontSelect from "@/components/admin/brand/BrandFontSelect";
import type { OrgBranding } from "@/config/brand-tokens";
import type { ChecklistContent, ChecklistItem } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: ChecklistContent | null | undefined): ChecklistContent {
  return {
    heading: c?.heading ?? "",
    heading_font: c?.heading_font ?? "heading",
    heading_color: c?.heading_color ?? "",
    heading_size_px: c?.heading_size_px ?? 28,
    bg_color: c?.bg_color ?? "brandSubtle",
    text_color: c?.text_color ?? "",
    text_size_px: c?.text_size_px ?? 16,
    columns_top: c?.columns_top ?? [],
    columns_bottom: c?.columns_bottom ?? [],
    padding_y_px: c?.padding_y_px ?? 48,
  };
}

export default function ChecklistEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: ChecklistContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<ChecklistContent>
      {...props}
      typeSlug="checklist"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<ChecklistContent> }) {
  const { draft, setDraft, commit, patch, brandTokens } = state;

  function updateRow(which: "columns_top" | "columns_bottom", fn: (arr: ChecklistItem[]) => ChecklistItem[]) {
    const next = fn(draft[which] ?? []);
    patch({ [which]: next } as Partial<ChecklistContent>);
  }
  function addItem(which: "columns_top" | "columns_bottom") {
    updateRow(which, (arr) => [...arr, { text: "" }]);
  }
  function removeItem(which: "columns_top" | "columns_bottom", i: number) {
    updateRow(which, (arr) => arr.filter((_, ix) => ix !== i));
  }
  function updateItemText(which: "columns_top" | "columns_bottom", i: number, text: string) {
    setDraft((d) => ({
      ...d,
      [which]: (d[which] ?? []).map((it, ix) => (ix === i ? { ...it, text } : it)),
    }));
  }

  return (
    <>
      <label className="block">
        <span className={labelCls}>Heading</span>
        <input
          className={inputCls}
          value={draft.heading ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, heading: e.target.value }))}
          onBlur={commit}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className={labelCls}>Heading font</span>
          <BrandFontSelect
            value={draft.heading_font}
            onChange={(v) => patch({ heading_font: v })}
          />
        </div>
        <div>
          <span className={labelCls}>Heading color (Auto = inherit)</span>
          <BrandColorSelect
            value={draft.heading_color}
            onChange={(v) => patch({ heading_color: v })}
            brandTokens={brandTokens}
            allowAuto
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="block w-32">
          <span className={labelCls}>Heading size (px)</span>
          <input
            type="number"
            min={12}
            max={80}
            className={inputCls}
            value={draft.heading_size_px ?? 28}
            onChange={(e) =>
              setDraft((d) => ({ ...d, heading_size_px: Number(e.target.value) || 28 }))
            }
            onBlur={commit}
          />
        </label>
        <label className="block w-32">
          <span className={labelCls}>Text size (px)</span>
          <input
            type="number"
            min={10}
            max={40}
            className={inputCls}
            value={draft.text_size_px ?? 16}
            onChange={(e) =>
              setDraft((d) => ({ ...d, text_size_px: Number(e.target.value) || 16 }))
            }
            onBlur={commit}
          />
        </label>
        <label className="block w-32">
          <span className={labelCls}>Padding Y (px)</span>
          <input
            type="number"
            min={0}
            max={400}
            className={inputCls}
            value={draft.padding_y_px ?? 48}
            onChange={(e) =>
              setDraft((d) => ({ ...d, padding_y_px: Number(e.target.value) || 0 }))
            }
            onBlur={commit}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className={labelCls}>Background color</span>
          <BrandColorSelect
            value={draft.bg_color}
            onChange={(v) => patch({ bg_color: v })}
            brandTokens={brandTokens}
            allowAuto
          />
        </div>
        <div>
          <span className={labelCls}>Text color (Auto = inherit)</span>
          <BrandColorSelect
            value={draft.text_color}
            onChange={(v) => patch({ text_color: v })}
            brandTokens={brandTokens}
            allowAuto
          />
        </div>
      </div>

      <RowEditor
        label="Top row items"
        items={draft.columns_top ?? []}
        onAdd={() => addItem("columns_top")}
        onRemove={(i) => removeItem("columns_top", i)}
        onChangeText={(i, t) => updateItemText("columns_top", i, t)}
        onBlur={commit}
      />
      <RowEditor
        label="Bottom row items"
        items={draft.columns_bottom ?? []}
        onAdd={() => addItem("columns_bottom")}
        onRemove={(i) => removeItem("columns_bottom", i)}
        onChangeText={(i, t) => updateItemText("columns_bottom", i, t)}
        onBlur={commit}
      />
    </>
  );
}

function RowEditor({
  label,
  items,
  onAdd,
  onRemove,
  onChangeText,
  onBlur,
}: {
  label: string;
  items: ChecklistItem[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  onChangeText: (i: number, text: string) => void;
  onBlur: () => void;
}) {
  return (
    <section className="rounded-md border border-zinc-200 p-4">
      <header className="mb-2 flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
          {label} ({items.length})
        </h4>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-full bg-anamaya-olive-dark px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white hover:opacity-90"
        >
          + Add
        </button>
      </header>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              className={inputCls}
              value={it.text}
              onChange={(e) => onChangeText(i, e.target.value)}
              onBlur={onBlur}
              placeholder="Checklist item text"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="rounded border border-red-300 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50"
            >
              ✕
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-xs italic text-anamaya-charcoal/50">No items yet.</li>
        )}
      </ul>
    </section>
  );
}
