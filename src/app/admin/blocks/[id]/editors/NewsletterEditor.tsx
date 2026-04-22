"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import BrandFontSelect from "@/components/admin/brand/BrandFontSelect";
import type { OrgBranding } from "@/config/brand-tokens";
import type { NewsletterContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: NewsletterContent | null | undefined): NewsletterContent {
  return {
    bg_color: c?.bg_color ?? "brandSubtle",
    heading: c?.heading ?? "",
    heading_font: c?.heading_font ?? "heading",
    heading_color: c?.heading_color ?? "",
    heading_size_px: c?.heading_size_px ?? 28,
    description: c?.description ?? "",
    description_color: c?.description_color ?? "",
    description_size_px: c?.description_size_px ?? 16,
    input_placeholder: c?.input_placeholder ?? "your@email.com",
    submit_label: c?.submit_label ?? "Subscribe",
    submit_color: c?.submit_color ?? "brandBtn",
    form_action_url: c?.form_action_url ?? "",
    padding_y_px: c?.padding_y_px ?? 48,
  };
}

export default function NewsletterEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: NewsletterContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<NewsletterContent>
      {...props}
      typeSlug="newsletter"
      normalize={normalize}
      renderForm={({ draft, setDraft, commit, patch, brandTokens }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <span className={labelCls}>Background color</span>
              <BrandColorSelect
                value={draft.bg_color}
                onChange={(v) => patch({ bg_color: v })}
                brandTokens={brandTokens}
                allowAuto
              />
            </div>
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
            <span className={labelCls}>Heading</span>
            <input
              className={inputCls}
              value={draft.heading ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, heading: e.target.value }))}
              onBlur={commit}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <span className={labelCls}>Heading font</span>
              <BrandFontSelect value={draft.heading_font} onChange={(v) => patch({ heading_font: v })} />
            </div>
            <div>
              <span className={labelCls}>Heading color</span>
              <BrandColorSelect
                value={draft.heading_color}
                onChange={(v) => patch({ heading_color: v })}
                brandTokens={brandTokens}
                allowAuto
              />
            </div>
            <label className="block">
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
          </div>

          <label className="block">
            <span className={labelCls}>Description</span>
            <textarea
              rows={2}
              className={inputCls}
              value={draft.description ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              onBlur={commit}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <span className={labelCls}>Description color</span>
              <BrandColorSelect
                value={draft.description_color}
                onChange={(v) => patch({ description_color: v })}
                brandTokens={brandTokens}
                allowAuto
              />
            </div>
            <label className="block">
              <span className={labelCls}>Description size (px)</span>
              <input
                type="number"
                min={10}
                max={40}
                className={inputCls}
                value={draft.description_size_px ?? 16}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description_size_px: Number(e.target.value) || 16 }))
                }
                onBlur={commit}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Form action URL (optional)</span>
              <input
                className={inputCls}
                value={draft.form_action_url ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, form_action_url: e.target.value }))}
                onBlur={commit}
                placeholder="https://api.example.com/subscribe"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className={labelCls}>Input placeholder</span>
              <input
                className={inputCls}
                value={draft.input_placeholder ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, input_placeholder: e.target.value }))}
                onBlur={commit}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Submit label</span>
              <input
                className={inputCls}
                value={draft.submit_label ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, submit_label: e.target.value }))}
                onBlur={commit}
              />
            </label>
            <div>
              <span className={labelCls}>Submit button color</span>
              <BrandColorSelect
                value={draft.submit_color}
                onChange={(v) => patch({ submit_color: v })}
                brandTokens={brandTokens}
              />
            </div>
          </div>
        </>
      )}
    />
  );
}
