"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import type { OrgBranding } from "@/config/brand-tokens";
import type { RetreatRatesContent, RetreatRateTier } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: RetreatRatesContent | null | undefined): RetreatRatesContent {
  return {
    retreat_id: c?.retreat_id ?? "",
    heading: c?.heading ?? "Dates & Rates",
    manual_dates_text: c?.manual_dates_text ?? "",
    manual_tiers: Array.isArray(c?.manual_tiers) ? c!.manual_tiers! : [],
    manual_spots_text: c?.manual_spots_text ?? "",
    manual_cta_label: c?.manual_cta_label ?? "",
    manual_cta_href: c?.manual_cta_href ?? "",
    bg_color: c?.bg_color ?? "",
    text_color: c?.text_color ?? "",
    container_width_px: c?.container_width_px ?? 1200,
    padding_y_px: c?.padding_y_px ?? 32,
  };
}

export default function RetreatRatesEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: RetreatRatesContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<RetreatRatesContent>
      {...props}
      typeSlug="retreat_rates"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<RetreatRatesContent> }) {
  const { draft, patch, brandTokens } = state;
  const tiers: RetreatRateTier[] = Array.isArray(draft.manual_tiers) ? draft.manual_tiers : [];
  const setTiers = (next: RetreatRateTier[]) => patch({ manual_tiers: next });

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">
            Live from AnamayOS (preferred)
          </h4>
          <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
            When set, dates/pricing/spots/Book button all come live from this retreat&rsquo;s
            AnamayOS record. The manual fields below only show if AnamayOS has nothing yet.
          </p>
        </header>
        <label className="block">
          <span className={labelCls}>AnamayOS retreat ID</span>
          <input
            className={inputCls}
            value={draft.retreat_id ?? ""}
            onChange={(e) => patch({ retreat_id: e.target.value })}
            placeholder="uuid"
          />
        </label>
        <label className="mt-4 block">
          <span className={labelCls}>Heading</span>
          <input
            className={inputCls}
            value={draft.heading ?? ""}
            onChange={(e) => patch({ heading: e.target.value })}
            placeholder="Dates & Rates"
          />
        </label>
      </section>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">
            Manual fallback (used when AnamayOS has no data yet)
          </h4>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Dates text</span>
            <input
              className={inputCls}
              value={draft.manual_dates_text ?? ""}
              onChange={(e) => patch({ manual_dates_text: e.target.value })}
              placeholder="Sept 12 – 19, 2026"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Spots-left text</span>
            <input
              className={inputCls}
              value={draft.manual_spots_text ?? ""}
              onChange={(e) => patch({ manual_spots_text: e.target.value })}
              placeholder="(optional)"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Button label</span>
            <input
              className={inputCls}
              value={draft.manual_cta_label ?? ""}
              onChange={(e) => patch({ manual_cta_label: e.target.value })}
              placeholder="Book Now"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Button link</span>
            <input
              className={inputCls}
              value={draft.manual_cta_href ?? ""}
              onChange={(e) => patch({ manual_cta_href: e.target.value })}
              placeholder="https://anamaya.secure.retreat.guru/..."
            />
          </label>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <span className={labelCls}>Room / rate tiers</span>
            <button
              type="button"
              onClick={() => setTiers([...tiers, { name: "", price: "" }])}
              className="rounded-full border border-anamaya-green px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-anamaya-green hover:bg-anamaya-green hover:text-white"
            >
              + Add tier
            </button>
          </div>
          <div className="space-y-2">
            {tiers.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={inputCls}
                  value={t.name}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[i] = { ...next[i], name: e.target.value };
                    setTiers(next);
                  }}
                  placeholder="Room type (e.g. Double)"
                />
                <input
                  className={inputCls}
                  value={t.price}
                  onChange={(e) => {
                    const next = [...tiers];
                    next[i] = { ...next[i], price: e.target.value };
                    setTiers(next);
                  }}
                  placeholder="Price (e.g. $1,595)"
                />
                <button
                  type="button"
                  onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  title="Remove tier"
                >
                  ×
                </button>
              </div>
            ))}
            {tiers.length === 0 && (
              <p className="text-[11px] italic text-anamaya-charcoal/50">
                No tiers yet — add room types and prices, or leave empty and rely on AnamayOS.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Appearance</h4>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={labelCls}>Background</span>
            <BrandColorSelect
              value={draft.bg_color}
              onChange={(v) => patch({ bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
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
        </div>
      </section>
    </div>
  );
}
