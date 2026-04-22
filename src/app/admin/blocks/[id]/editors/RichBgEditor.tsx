"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import type { OrgBranding } from "@/config/brand-tokens";
import type { RichBgContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: RichBgContent | null | undefined): RichBgContent {
  return {
    html: c?.html ?? "",
    bg_color: c?.bg_color ?? "brandSubtle",
    bg_image_url: c?.bg_image_url ?? "",
    bg_image_fit: c?.bg_image_fit ?? "cover",
    text_color: c?.text_color ?? "",
    padding_y_px: c?.padding_y_px ?? 48,
  };
}

export default function RichBgEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: RichBgContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<RichBgContent>
      {...props}
      typeSlug="rich_bg"
      normalize={normalize}
      renderForm={({ draft, setDraft, commit, patch, brandTokens }) => (
        <>
          <label className="block">
            <span className={labelCls}>HTML content</span>
            <textarea
              rows={8}
              className={inputCls}
              value={draft.html ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, html: e.target.value }))}
              onBlur={commit}
              placeholder="<p>Your content here…</p>"
            />
          </label>

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

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <label className="block">
              <span className={labelCls}>Background image URL (optional)</span>
              <input
                className={inputCls}
                value={draft.bg_image_url ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, bg_image_url: e.target.value }))}
                onBlur={commit}
                placeholder="/images/texture.png"
              />
            </label>
            <label className="block">
              <span className={labelCls}>Fit</span>
              <select
                className={inputCls}
                value={draft.bg_image_fit ?? "cover"}
                onChange={(e) => patch({ bg_image_fit: e.target.value as RichBgContent["bg_image_fit"] })}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="tile">Tile</option>
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
        </>
      )}
    />
  );
}
