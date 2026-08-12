"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import LayoutWidthsFieldset from "@/components/admin/blocks/LayoutWidthsFieldset";
import { normalizeLayoutWidths } from "@/lib/layout-widths";
import type { OrgBranding } from "@/config/brand-tokens";
import type { ServiceCardsContent, ServiceCardItem } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: ServiceCardsContent | null | undefined): ServiceCardsContent {
  return {
    ...normalizeLayoutWidths(c, 760),
    domain: c?.domain ?? "",
    heading: c?.heading ?? "",
    show_divider: c?.show_divider ?? true,
    items: Array.isArray(c?.items) ? c!.items! : [],
    bg_color: c?.bg_color ?? "",
    text_color: c?.text_color ?? "",
    heading_color: c?.heading_color ?? "",
    container_width_px: c?.container_width_px ?? 760,
    padding_y_px: c?.padding_y_px ?? 64,
  };
}

export default function ServiceCardsEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: ServiceCardsContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<ServiceCardsContent>
      {...props}
      typeSlug="service_cards"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<ServiceCardsContent> }) {
  const { draft, patch, brandTokens } = state;
  const items: ServiceCardItem[] = draft.items ?? [];

  function patchItem(idx: number, p: Partial<ServiceCardItem>) {
    patch({ items: items.map((it, i) => (i === idx ? { ...it, ...p } : it)) });
  }
  function addItem() {
    patch({ items: [...items, { name: "New service", price: "", blurb: "" }] });
  }
  function removeItem(idx: number) {
    patch({ items: items.filter((_, i) => i !== idx) });
  }
  function moveItem(idx: number, dir: -1 | 1) {
    const arr = [...items];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    patch({ items: arr });
  }

  return (
    <div className="space-y-6">
      {/* Layout widths — first, right under the live preview. */}
      <LayoutWidthsFieldset values={draft} onPatch={patch} maxContentDefault={760} />

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Cards</h4>
          <p className="mt-0.5 text-xs text-anamaya-charcoal/60">
            Each service is a card with a name, price, a one-line blurb, a
            &ldquo;More info&rdquo; accordion (longer description + optional
            route/time + a link), and an optional right-side image.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Section heading</span>
            <input
              className={inputCls}
              value={draft.heading ?? ""}
              onChange={(e) => patch({ heading: e.target.value })}
              placeholder="(optional)"
            />
          </label>
          <label className="block">
            <span className={labelCls}>AnamayaOS domain (live mode)</span>
            <input
              className={inputCls}
              value={draft.domain ?? ""}
              onChange={(e) => patch({ domain: e.target.value })}
              placeholder="(blank = use the manual cards below)"
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              When set, cards come LIVE from AnamayaOS (service_catalog for
              this domain). If AO is unreachable or has no data, the manual
              cards below are used as a fallback. Leave blank for manual mode.
            </p>
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.show_divider ?? true}
              onChange={(e) => patch({ show_divider: e.target.checked })}
            />
            <span className="text-sm text-anamaya-charcoal">
              Show the ornate divider under the heading
            </span>
          </label>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
              Manual cards {draft.domain ? "(fallback)" : ""}
            </span>
            <button
              type="button"
              onClick={addItem}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-wider hover:bg-zinc-50"
            >
              + Add card
            </button>
          </div>

          <ul className="space-y-4">
            {items.map((item, idx) => (
              <li key={idx} className="rounded border border-zinc-200 bg-white p-3">
                <div className="mb-2 flex items-center gap-3 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
                    Card {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveItem(idx, -1)}
                    className="text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(idx, 1)}
                    className="text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="ml-auto text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelCls}>Name</span>
                    <input
                      className={inputCls}
                      value={item.name ?? ""}
                      onChange={(e) => patchItem(idx, { name: e.target.value })}
                      placeholder="Private Shuttle"
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Price</span>
                    <input
                      className={inputCls}
                      value={item.price ?? ""}
                      onChange={(e) => patchItem(idx, { price: e.target.value })}
                      placeholder="$25 + tax (blank → “Enquire”)"
                    />
                  </label>
                </div>

                <label className="mt-2 block">
                  <span className={labelCls}>Blurb (one line)</span>
                  <input
                    className={inputCls}
                    value={item.blurb ?? ""}
                    onChange={(e) => patchItem(idx, { blurb: e.target.value })}
                    placeholder="A short summary shown above “More info”."
                  />
                </label>

                <label className="mt-2 block">
                  <span className={labelCls}>Description (in “More info”)</span>
                  <textarea
                    rows={3}
                    className={inputCls}
                    value={item.description ?? ""}
                    onChange={(e) => patchItem(idx, { description: e.target.value })}
                    placeholder="The longer text revealed by the accordion."
                  />
                </label>

                <label className="mt-2 block">
                  <span className={labelCls}>Image URL (right-side 3:2)</span>
                  <input
                    className={inputCls}
                    value={item.image_url ?? ""}
                    onChange={(e) => patchItem(idx, { image_url: e.target.value })}
                    placeholder="https://…  (blank = no image, text goes full width)"
                  />
                  <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
                    Paste an image URL. Leave blank to render NO image on the
                    public page — the card text simply spans the full width.
                  </p>
                </label>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelCls}>Route (optional)</span>
                    <input
                      className={inputCls}
                      value={item.route ?? ""}
                      onChange={(e) => patchItem(idx, { route: e.target.value })}
                      placeholder="Airport → Anamaya"
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Time / duration (optional)</span>
                    <input
                      className={inputCls}
                      value={item.duration ?? ""}
                      onChange={(e) => patchItem(idx, { duration: e.target.value })}
                      placeholder="15–20 min"
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Link label (optional)</span>
                    <input
                      className={inputCls}
                      value={item.link_label ?? ""}
                      onChange={(e) => patchItem(idx, { link_label: e.target.value })}
                      placeholder="Email us your flight details"
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Link URL (optional)</span>
                    <input
                      className={inputCls}
                      value={item.link_href ?? ""}
                      onChange={(e) => patchItem(idx, { link_href: e.target.value })}
                      placeholder="mailto:… or https://…"
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
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
          <label className="block">
            <span className={labelCls}>Container max width (px)</span>
            <input
              type="number"
              className={inputCls}
              value={draft.container_width_px ?? 760}
              onChange={(e) => patch({ container_width_px: Number(e.target.value) || 760 })}
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
