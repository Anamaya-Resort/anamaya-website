"use client";

import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import BrandFontSelect from "@/components/admin/brand/BrandFontSelect";
import type { OrgBranding } from "@/config/brand-tokens";
import type { BlockCta } from "@/types/blocks";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70";

/**
 * Optional "Call-To-Action button at the bottom" fieldset. Drop it into
 * any block editor whose content extends BlockCta. The parent editor
 * passes its current cta values + handlers to patch them.
 */
export default function CtaFieldset({
  cta,
  onChange,
  brandTokens,
}: {
  cta: BlockCta;
  onChange: (update: Partial<BlockCta>) => void;
  brandTokens: Required<OrgBranding>;
}) {
  return (
    <section className="rounded-md border border-zinc-200 p-4">
      <header className="mb-2 flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
          CTA button (optional)
        </h4>
        <label className="flex items-center gap-2 text-xs text-anamaya-charcoal/70">
          <input
            type="checkbox"
            checked={!!cta.cta_enabled}
            onChange={(e) => onChange({ cta_enabled: e.target.checked })}
          />
          Enabled
        </label>
      </header>

      {cta.cta_enabled && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Button label</span>
              <input
                className={inputCls}
                value={cta.cta_label ?? ""}
                onChange={(e) => onChange({ cta_label: e.target.value })}
                placeholder="Book now"
              />
            </label>
            <label className="block">
              <span className={labelCls}>Link (URL)</span>
              <input
                className={inputCls}
                value={cta.cta_href ?? ""}
                onChange={(e) => onChange({ cta_href: e.target.value })}
                placeholder="/retreats or https://…"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className={labelCls}>Button color</span>
              <BrandColorSelect
                value={cta.cta_bg_color}
                onChange={(v) => onChange({ cta_bg_color: v })}
                brandTokens={brandTokens}
              />
            </div>
            <div>
              <span className={labelCls}>Text color</span>
              <BrandColorSelect
                value={cta.cta_text_color}
                onChange={(v) => onChange({ cta_text_color: v })}
                brandTokens={brandTokens}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <span className={labelCls}>Font</span>
              <BrandFontSelect
                value={cta.cta_font}
                onChange={(v) => onChange({ cta_font: v })}
              />
            </div>
            <label className="block w-32">
              <span className={labelCls}>Size (px)</span>
              <input
                type="number"
                min={10}
                max={48}
                className={inputCls}
                value={cta.cta_size_px ?? 14}
                onChange={(e) =>
                  onChange({ cta_size_px: Number(e.target.value) || 14 })
                }
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
