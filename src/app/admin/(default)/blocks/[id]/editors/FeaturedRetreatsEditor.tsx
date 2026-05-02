"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import type { OrgBranding } from "@/config/brand-tokens";
import type { FeaturedRetreatsContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: FeaturedRetreatsContent | null | undefined): FeaturedRetreatsContent {
  return {
    heading: c?.heading ?? "Featured Retreats",
    subheading: c?.subheading ?? "",
    max_count: c?.max_count ?? 5,
    register_label: c?.register_label ?? "Register Now",
    url_pattern: c?.url_pattern ?? "/retreats/{slug}/",
    bg_color: c?.bg_color ?? "",
    text_color: c?.text_color ?? "",
    heading_color: c?.heading_color ?? "",
    card_bg_color: c?.card_bg_color ?? "",
    padding_y_px: c?.padding_y_px ?? 64,
    container_width_px: c?.container_width_px ?? 1200,
  };
}

export default function FeaturedRetreatsEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: FeaturedRetreatsContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<FeaturedRetreatsContent>
      {...props}
      typeSlug="featured_retreats"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<FeaturedRetreatsContent> }) {
  const { draft, patch, brandTokens } = state;
  return (
    <div className="space-y-6">
      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Heading</h4>
          <p className="mt-0.5 text-xs text-anamaya-charcoal/60">
            The retreats themselves come from AnamayaOS — every retreat
            with <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">is_featured = true</code>{" "}
            and a future end-date is rendered as a card. To change which
            retreats appear, mark them featured in AO.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Section heading</span>
            <input
              className={inputCls}
              value={draft.heading ?? ""}
              onChange={(e) => patch({ heading: e.target.value })}
              placeholder="Featured Retreats"
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
            <span className={labelCls}>Max retreats</span>
            <input
              type="number"
              min={1}
              max={50}
              className={inputCls}
              value={draft.max_count ?? 5}
              onChange={(e) =>
                patch({ max_count: Math.max(1, Math.min(50, Number(e.target.value) || 5)) })
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
              is replaced with each retreat&rsquo;s AO website_slug. When
              a retreat has no website_slug, falls back to its
              registration_link or external_link.
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
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              Auto = transparent.
            </p>
          </div>
          <div>
            <span className={labelCls}>Card background</span>
            <BrandColorSelect
              value={draft.card_bg_color}
              onChange={(v) => patch({ card_bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              Auto = white.
            </p>
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
              onChange={(e) =>
                patch({ padding_y_px: Number(e.target.value) || 64 })
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>Container max width (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.container_width_px ?? 1200}
              onChange={(e) =>
                patch({ container_width_px: Number(e.target.value) || 1200 })
              }
            />
          </label>
        </div>
      </section>
    </div>
  );
}
