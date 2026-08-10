"use client";

import BlockEditorChrome, {
  type BlockEditorVariant,
  type BlockEditorState,
} from "@/components/admin/blocks/BlockEditorChrome";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import LayoutWidthsFieldset from "@/components/admin/blocks/LayoutWidthsFieldset";
import { normalizeLayoutWidths } from "@/lib/layout-widths";
import type { OrgBranding } from "@/config/brand-tokens";
import type { RetreatsCalendarContent } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

function normalize(c: RetreatsCalendarContent | null | undefined): RetreatsCalendarContent {
  return {
    ...normalizeLayoutWidths(c, 1100),
    heading: c?.heading ?? "Upcoming Retreats",
    subheading: c?.subheading ?? "",
    book_label: c?.book_label ?? "Book This Retreat",
    url_pattern: c?.url_pattern ?? "/retreat/{slug}/",
    max_count: c?.max_count ?? 100,
    group_by_month: c?.group_by_month ?? true,
    bg_color: c?.bg_color ?? "",
    text_color: c?.text_color ?? "",
    heading_color: c?.heading_color ?? "",
    card_bg_color: c?.card_bg_color ?? "",
    card_border_color: c?.card_border_color ?? "",
    card_border_width_px: c?.card_border_width_px ?? 1,
    card_corner_radius_px: c?.card_corner_radius_px ?? 8,
    padding_y_px: c?.padding_y_px ?? 64,
    container_width_px: c?.container_width_px ?? 1100,
  };
}

export default function RetreatsCalendarEditor(props: {
  blockId: string;
  name: string;
  slug: string;
  content: RetreatsCalendarContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  typeName: string;
}) {
  return (
    <BlockEditorChrome<RetreatsCalendarContent>
      {...props}
      typeSlug="retreats_calendar"
      normalize={normalize}
      renderForm={(state) => <Form state={state} />}
    />
  );
}

function Form({ state }: { state: BlockEditorState<RetreatsCalendarContent> }) {
  const { draft, patch, brandTokens } = state;
  return (
    <div className="space-y-6">
      {/* Layout widths — first, right under the live preview. */}
      <LayoutWidthsFieldset values={draft} onPatch={patch} maxContentDefault={1100} />

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <header className="mb-3">
          <h4 className="text-sm font-semibold text-anamaya-charcoal">Calendar</h4>
          <p className="mt-0.5 text-xs text-anamaya-charcoal/60">
            The retreats come straight from AnamayaOS — every retreat that
            is public, active, confirmed, and starts in the future is listed
            in date order. Booking happens on Retreat Guru; the Book button
            links out there. To change the list, edit the retreat in AO.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Section heading</span>
            <input
              className={inputCls}
              value={draft.heading ?? ""}
              onChange={(e) => patch({ heading: e.target.value })}
              placeholder="Upcoming Retreats"
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
            <span className={labelCls}>Book button label</span>
            <input
              className={inputCls}
              value={draft.book_label ?? ""}
              onChange={(e) => patch({ book_label: e.target.value })}
              placeholder="Book This Retreat"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Max rows</span>
            <input
              type="number"
              min={1}
              max={200}
              className={inputCls}
              value={draft.max_count ?? 100}
              onChange={(e) =>
                patch({ max_count: Math.max(1, Math.min(200, Number(e.target.value) || 100)) })
              }
            />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.group_by_month ?? true}
              onChange={(e) => patch({ group_by_month: e.target.checked })}
            />
            <span className="text-sm text-anamaya-charcoal">Group retreats under month headings</span>
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Retreat URL pattern</span>
            <input
              className={inputCls}
              value={draft.url_pattern ?? ""}
              onChange={(e) => patch({ url_pattern: e.target.value })}
              placeholder="/retreat/{slug}/"
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">
                {"{slug}"}
              </code>{" "}
              is replaced with each retreat&rsquo;s AO website_slug (used by
              the name/image link). When a retreat has no website_slug it
              falls back to its booking link.
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
            <span className={labelCls}>Card background</span>
            <BrandColorSelect
              value={draft.card_bg_color}
              onChange={(v) => patch({ card_bg_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              Auto = soft white tint (matches the site&rsquo;s cards).
            </p>
          </div>
          <div>
            <span className={labelCls}>Card border</span>
            <BrandColorSelect
              value={draft.card_border_color}
              onChange={(v) => patch({ card_border_color: v })}
              brandTokens={brandTokens}
              allowAuto
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              Auto = anamaya-mint (matches the site&rsquo;s cards).
            </p>
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
                  card_border_width_px: Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : 1,
                });
              }}
            />
            <p className="mt-1 text-[11px] italic text-anamaya-charcoal/60">
              0 disables the border entirely.
            </p>
          </label>
          <label className="block">
            <span className={labelCls}>Corner radius (px)</span>
            <input
              type="number"
              min={0}
              max={40}
              className={inputCls}
              value={draft.card_corner_radius_px ?? 8}
              onChange={(e) => {
                const n = Number(e.target.value);
                patch({
                  card_corner_radius_px: Number.isFinite(n) ? Math.max(0, Math.min(40, n)) : 8,
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
              value={draft.container_width_px ?? 1100}
              onChange={(e) => patch({ container_width_px: Number(e.target.value) || 1100 })}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
