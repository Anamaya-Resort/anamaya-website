"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import type { OrgBranding } from "@/config/brand-tokens";
import type { UiFooterLegalContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: UiFooterLegalContent | null | undefined): UiFooterLegalContent {
  return {
    bg_color: c?.bg_color ?? "",
    text_color: c?.text_color ?? "",
    body_html: c?.body_html ?? "",
    align: c?.align ?? "center",
    padding_y_px: c?.padding_y_px ?? 16,
    font_size_px: c?.font_size_px ?? 12,
  };
}

export default function UiFooterLegalEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: UiFooterLegalContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<UiFooterLegalContent>
      {...props}
      typeSlug="ui_footer_legal"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<UiFooterLegalContent> }) {
  const { draft, patch, brandTokens } = state;
  return (
    <div className="space-y-6">
      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Appearance</h4>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={labelCls}>Background color</span>
            <BrandColorSelect
              value={draft.bg_color}
              onChange={(v) => patch({ bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              Auto = anamaya-cream (#fbfbfb).
            </p>
          </div>
          <div>
            <span className={labelCls}>Text color</span>
            <BrandColorSelect
              value={draft.text_color}
              onChange={(v) => patch({ text_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <label className="block">
            <span className={labelCls}>Alignment</span>
            <select
              className={inputCls}
              value={draft.align ?? "center"}
              onChange={(e) =>
                patch({ align: e.target.value as UiFooterLegalContent["align"] })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Vertical padding (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.padding_y_px ?? 16}
              onChange={(e) =>
                patch({ padding_y_px: Number(e.target.value) || 16 })
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>Font size (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.font_size_px ?? 12}
              onChange={(e) =>
                patch({ font_size_px: Number(e.target.value) || 12 })
              }
            />
          </label>
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Body HTML</h4>
          <p className="mt-0.5 text-xs text-anamaya-charcoal/60">
            Plain HTML — supports inline links and tags. The literal token{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">
              {"{year}"}
            </code>{" "}
            is replaced with the current year at render time.
          </p>
        </header>
        <textarea
          className={inputCls}
          rows={8}
          value={draft.body_html ?? ""}
          onChange={(e) => patch({ body_html: e.target.value })}
          placeholder='<p>Copyright © {year} ...</p>'
        />
      </section>
    </div>
  );
}
