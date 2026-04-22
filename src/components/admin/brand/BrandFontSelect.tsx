"use client";

import { BRAND_FONTS, type BrandFontKey } from "@/config/brand-tokens";

type Props = {
  value: BrandFontKey | undefined;
  onChange: (value: BrandFontKey) => void;
  /** Text shown inside each font preview. */
  previewText?: string;
};

/**
 * Pill row of brand-approved fonts. Each pill previews its family so the
 * editor can see what they're picking.
 */
export default function BrandFontSelect({
  value,
  onChange,
  previewText = "Aa",
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {BRAND_FONTS.map((f) => {
        const selected = value === f.key;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange(f.key)}
            className={`flex h-10 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors ${
              selected
                ? "border-anamaya-green bg-anamaya-green/10 text-anamaya-charcoal"
                : "border-zinc-300 bg-white text-anamaya-charcoal/70 hover:bg-zinc-50"
            }`}
            aria-pressed={selected}
          >
            <span className={`${f.cssClass} text-base uppercase tracking-wider`}>{previewText}</span>
            <span>{f.label}</span>
          </button>
        );
      })}
    </div>
  );
}
