"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import LayoutWidthsFieldset from "@/components/admin/blocks/LayoutWidthsFieldset";
import { normalizeLayoutWidths } from "@/lib/layout-widths";
import type { OrgBranding } from "@/config/brand-tokens";
import type { ServiceMenuContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: ServiceMenuContent | null | undefined): ServiceMenuContent {
  return {
    ...normalizeLayoutWidths(c, 820),
    domain: c?.domain ?? "spa",
    heading: c?.heading ?? "",
    show_dividers: c?.show_dividers ?? true,
    show_flower_titles: c?.show_flower_titles ?? true,
    book_label: c?.book_label ?? "",
    book_href: c?.book_href ?? "",
    bg_color: c?.bg_color ?? "",
    text_color: c?.text_color ?? "",
    heading_color: c?.heading_color ?? "",
    price_color: c?.price_color ?? "",
    container_width_px: c?.container_width_px ?? 820,
    padding_y_px: c?.padding_y_px ?? 64,
  };
}

export default function ServiceMenuEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: ServiceMenuContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<ServiceMenuContent>
      {...props}
      typeSlug="service_menu"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<ServiceMenuContent> }) {
  const { draft, patch, brandTokens } = state;
  return (
    <div className="space-y-6">
      {/* Layout widths — first, right under the live preview. */}
      <LayoutWidthsFieldset values={draft} onPatch={patch} maxContentDefault={820} />

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Menu</h4>
          <p className="mt-0.5 text-xs text-anamaya-charcoal/60">
            The services come straight from AnamayaOS — every service in this
            domain that is active is grouped by its category and listed in
            sort order, with tiered durations/prices. Prices are never edited
            here; to change the menu, edit the services in AnamayaOS.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Domain</span>
            <input
              className={inputCls}
              value={draft.domain ?? ""}
              onChange={(e) => patch({ domain: e.target.value })}
              placeholder="spa"
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              Which AnamayaOS service domain to read (e.g. <code>spa</code>,
              and later <code>cookbook</code>, <code>excursions</code>,{" "}
              <code>biohacking</code>).
            </p>
          </label>
          <label className="block">
            <span className={labelCls}>Section heading</span>
            <input
              className={inputCls}
              value={draft.heading ?? ""}
              onChange={(e) => patch({ heading: e.target.value })}
              placeholder="(optional)"
            />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.show_dividers ?? true}
              onChange={(e) => patch({ show_dividers: e.target.checked })}
            />
            <span className="text-sm text-anamaya-charcoal">
              Show the ornate divider above each category
            </span>
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.show_flower_titles ?? true}
              onChange={(e) => patch({ show_flower_titles: e.target.checked })}
            />
            <span className="text-sm text-anamaya-charcoal">
              Bookend each category title with the flower ornament
            </span>
          </label>
          <label className="block">
            <span className={labelCls}>Book button label</span>
            <input
              className={inputCls}
              value={draft.book_label ?? ""}
              onChange={(e) => patch({ book_label: e.target.value })}
              placeholder="(optional — leave blank to hide)"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Book button link</span>
            <input
              className={inputCls}
              value={draft.book_href ?? ""}
              onChange={(e) => patch({ book_href: e.target.value })}
              placeholder="https://…"
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              The pill only shows when both a label and a link are set.
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
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">Auto = transparent.</p>
          </div>
          <div>
            <span className={labelCls}>Body text color</span>
            <BrandColorSelect
              value={draft.text_color}
              onChange={(v) => patch({ text_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">Auto = charcoal.</p>
          </div>
          <div>
            <span className={labelCls}>Heading / title color</span>
            <BrandColorSelect
              value={draft.heading_color}
              onChange={(v) => patch({ heading_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">Auto = olive-dark.</p>
          </div>
          <div>
            <span className={labelCls}>Price color</span>
            <BrandColorSelect
              value={draft.price_color}
              onChange={(v) => patch({ price_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">Auto = olive-dark.</p>
          </div>
          <label className="block">
            <span className={labelCls}>Container max width (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.container_width_px ?? 820}
              onChange={(e) => patch({ container_width_px: Number(e.target.value) || 820 })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Vertical padding (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.padding_y_px ?? 64}
              onChange={(e) => patch({ padding_y_px: Number(e.target.value) || 64 })}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
