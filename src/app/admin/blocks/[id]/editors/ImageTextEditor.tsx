"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import ImageUploadButton from "@/components/admin/blocks/ImageUploadButton";
import CtaFieldset from "@/components/admin/blocks/CtaFieldset";
import type { OrgBranding } from "@/config/brand-tokens";
import type { ImageTextContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: ImageTextContent | null | undefined): ImageTextContent {
  return {
    image_url: c?.image_url ?? "",
    image_side: c?.image_side ?? "left",
    image_width_pct: c?.image_width_pct ?? 50,
    html: c?.html ?? "",
    bg_color: c?.bg_color ?? "brand",
    text_color: c?.text_color ?? "",
    padding_y_px: c?.padding_y_px ?? 48,
    vertical_align: c?.vertical_align ?? "center",
  };
}

const WIDTH_OPTIONS = [25, 33, 40, 50, 60, 67, 75];

export default function ImageTextEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: ImageTextContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<ImageTextContent>
      {...props}
      typeSlug="image_text"
      normalize={normalize}
      renderForm={({ draft, setDraft, commit, patch, brandTokens }) => (
        <>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className={labelCls}>Image</span>
              <ImageUploadButton
                value={draft.image_url}
                onUploaded={(url) => patch({ image_url: url })}
                kind="split-images"
                maxWidth={2000}
              />
            </div>
            <input
              className={inputCls}
              value={draft.image_url ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
              onBlur={commit}
              placeholder="Paste a URL or use Upload →"
            />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="block w-40">
              <span className={labelCls}>Image side</span>
              <div className="inline-flex rounded-md border border-zinc-300 bg-white p-0.5 text-[11px] font-semibold uppercase tracking-wider">
                {(["left", "right"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patch({ image_side: s })}
                    className={`rounded-sm px-3 py-1 transition-colors ${
                      draft.image_side === s
                        ? "bg-anamaya-charcoal text-white"
                        : "text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </label>
            <label className="block w-32">
              <span className={labelCls}>Image width %</span>
              <select
                className={inputCls}
                value={draft.image_width_pct ?? 50}
                onChange={(e) => patch({ image_width_pct: Number(e.target.value) })}
              >
                {WIDTH_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    {w}/{100 - w}
                  </option>
                ))}
              </select>
            </label>
            <label className="block w-32">
              <span className={labelCls}>Vertical align</span>
              <select
                className={inputCls}
                value={draft.vertical_align ?? "center"}
                onChange={(e) => patch({ vertical_align: e.target.value as ImageTextContent["vertical_align"] })}
              >
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
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

          <label className="block">
            <span className={labelCls}>HTML content</span>
            <textarea
              rows={8}
              className={inputCls}
              value={draft.html ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, html: e.target.value }))}
              onBlur={commit}
              placeholder="<h2>Title</h2>\n<p>Body…</p>"
            />
          </label>

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

          <CtaFieldset cta={draft} onChange={(u) => patch(u)} brandTokens={brandTokens} />
        </>
      )}
    />
  );
}
