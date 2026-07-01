"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import LayoutWidthsFieldset from "@/components/admin/blocks/LayoutWidthsFieldset";
import { normalizeLayoutWidths } from "@/lib/layout-widths";
import type { OrgBranding } from "@/config/brand-tokens";
import type { FeaturedBySearchContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: FeaturedBySearchContent | null | undefined): FeaturedBySearchContent {
  return {
    ...normalizeLayoutWidths(c, c?.container_width_px ?? 1200),
    heading: c?.heading ?? "Recommended Retreats",
    subheading: c?.subheading ?? "",
    max_count: c?.max_count ?? 4,
    use_page_context: c?.use_page_context ?? true,
    search_terms: c?.search_terms ?? "",
    register_label: c?.register_label ?? "Register Now",
    url_pattern: c?.url_pattern ?? "/retreats/{slug}/",
    bg_color: c?.bg_color ?? "",
    text_color: c?.text_color ?? "",
    heading_color: c?.heading_color ?? "",
    card_bg_color: c?.card_bg_color ?? "",
    card_border_color: c?.card_border_color ?? "",
    card_border_width_px: c?.card_border_width_px ?? 1,
    card_corner_radius_px: c?.card_corner_radius_px ?? 8,
    padding_y_px: c?.padding_y_px ?? 64,
    container_width_px: c?.container_width_px ?? 1200,
  };
}

export default function FeaturedBySearchEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: FeaturedBySearchContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<FeaturedBySearchContent>
      {...props}
      typeSlug="featured_by_search"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<FeaturedBySearchContent> }) {
  const { draft, patch, brandTokens } = state;
  const usePage = draft.use_page_context !== false;

  return (
    <div className="space-y-6">
      <LayoutWidthsFieldset values={draft} onPatch={patch} maxContentDefault={draft.container_width_px ?? 1200} />

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">
            Recommendation context
          </h4>
          <p className="mt-0.5 text-xs text-anamaya-charcoal/60">
            Our AI ranks upcoming retreats by how well they match a
            context — a much smarter match than keyword search. Choose
            what the context is.
          </p>
        </header>

        <label className="flex items-start gap-2 rounded-md border border-zinc-200 bg-white p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-anamaya-green"
            checked={usePage}
            onChange={(e) => patch({ use_page_context: e.target.checked })}
          />
          <span className="text-sm text-anamaya-charcoal">
            <strong>Use this page&rsquo;s content as the context</strong>
            <span className="mt-0.5 block text-xs text-anamaya-charcoal/60">
              The AI reads whatever page or post this block is placed on
              and recommends the retreats that best fit it. Best for
              blog posts and topic pages. Uncheck to type your own
              search phrase instead.
            </span>
          </span>
        </label>

        {!usePage && (
          <label className="mt-4 block">
            <span className={labelCls}>Search phrase</span>
            <textarea
              rows={2}
              className={inputCls}
              value={draft.search_terms ?? ""}
              onChange={(e) => patch({ search_terms: e.target.value })}
              placeholder="e.g. breathwork and nervous-system reset for burnout"
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              Describe the kind of retreat to recommend in plain language
              — themes, style, audience. The AI matches on meaning, not
              exact words.
            </p>
          </label>
        )}
      </section>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Heading &amp; layout</h4>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Section heading</span>
            <input
              className={inputCls}
              value={draft.heading ?? ""}
              onChange={(e) => patch({ heading: e.target.value })}
              placeholder="Recommended Retreats"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Sub-text</span>
            <input
              className={inputCls}
              value={draft.subheading ?? ""}
              onChange={(e) => patch({ subheading: e.target.value })}
              placeholder="(optional)"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Number to show</span>
            <input
              type="number"
              min={1}
              max={50}
              className={inputCls}
              value={draft.max_count ?? 4}
              onChange={(e) =>
                patch({ max_count: Math.max(1, Math.min(50, Number(e.target.value) || 4)) })
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>Register button label</span>
            <input
              className={inputCls}
              value={draft.register_label ?? ""}
              onChange={(e) => patch({ register_label: e.target.value })}
              placeholder="Register Now"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Retreat URL pattern</span>
            <input
              className={inputCls}
              value={draft.url_pattern ?? ""}
              onChange={(e) => patch({ url_pattern: e.target.value })}
              placeholder="/retreats/{slug}/"
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">
                {"{slug}"}
              </code>{" "}
              is replaced with each retreat&rsquo;s AO website_slug.
            </p>
          </label>
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Appearance</h4>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={labelCls}>Section background</span>
            <BrandColorSelect
              value={draft.bg_color}
              onChange={(v) => patch({ bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <div>
            <span className={labelCls}>Card background</span>
            <BrandColorSelect
              value={draft.card_bg_color}
              onChange={(v) => patch({ card_bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <div>
            <span className={labelCls}>Card border</span>
            <BrandColorSelect
              value={draft.card_border_color}
              onChange={(v) => patch({ card_border_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <label className="block">
            <span className={labelCls}>Border thickness (px)</span>
            <input
              type="number"
              min={0}
              max={10}
              className={inputCls}
              value={draft.card_border_width_px ?? 1}
              onChange={(e) => {
                const n = Number(e.target.value);
                patch({
                  card_border_width_px: Number.isFinite(n)
                    ? Math.max(0, Math.min(10, n))
                    : 1,
                });
              }}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Corner radius (px)</span>
            <input
              type="number"
              min={0}
              max={20}
              className={inputCls}
              value={draft.card_corner_radius_px ?? 8}
              onChange={(e) => {
                const n = Number(e.target.value);
                patch({
                  card_corner_radius_px: Number.isFinite(n)
                    ? Math.max(0, Math.min(20, n))
                    : 8,
                });
              }}
            />
          </label>
          <div>
            <span className={labelCls}>Heading color</span>
            <BrandColorSelect
              value={draft.heading_color}
              onChange={(v) => patch({ heading_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <div>
            <span className={labelCls}>Body text color</span>
            <BrandColorSelect
              value={draft.text_color}
              onChange={(v) => patch({ text_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
          </div>
          <label className="block">
            <span className={labelCls}>Vertical padding (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.padding_y_px ?? 64}
              onChange={(e) => patch({ padding_y_px: Number(e.target.value) || 64 })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Container max width (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.container_width_px ?? 1200}
              onChange={(e) => patch({ container_width_px: Number(e.target.value) || 1200 })}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
