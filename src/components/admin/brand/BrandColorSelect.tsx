"use client";

import type { BrandingColors, OrgBranding } from "@/config/brand-tokens";
import {
  BRAND_COLOR_KEYS,
  COLOR_LABELS,
  STATUS_COLOR_KEYS,
} from "@/config/brand-tokens";

type Props = {
  /** Current value — a brand token key ("brandHighlight") or empty for "auto". */
  value: string | undefined;
  onChange: (value: string) => void;
  brandTokens: Required<OrgBranding>;
  /** Which subset of keys to show. Defaults to the decorative brand palette. */
  keys?: (keyof BrandingColors)[];
  /** When true, include an "Auto" option that clears the selection. */
  allowAuto?: boolean;
  /** Include status colors (destructive/success/…) as a second row. */
  includeStatus?: boolean;
};

/**
 * Renders each brand color as a clickable swatch. Stores the token *key*
 * (not a hex) so live AO brand changes propagate to blocks without editing.
 */
export default function BrandColorSelect({
  value,
  onChange,
  brandTokens,
  keys = BRAND_COLOR_KEYS,
  allowAuto = false,
  includeStatus = false,
}: Props) {
  const allKeys = includeStatus ? [...keys, ...STATUS_COLOR_KEYS] : keys;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowAuto && (
        <button
          type="button"
          onClick={() => onChange("")}
          className={`flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors ${
            !value
              ? "border-anamaya-green bg-anamaya-green/10 text-anamaya-charcoal"
              : "border-zinc-300 bg-white text-anamaya-charcoal/70 hover:bg-zinc-50"
          }`}
          title="Use the default for this context"
        >
          Auto
        </button>
      )}
      {allKeys.map((key) => {
        const hex = brandTokens.light[key];
        if (!hex) return null;
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            title={`${COLOR_LABELS[key]} — ${hex}`}
            className={`group relative h-9 w-9 overflow-hidden rounded-md border transition-all ${
              selected
                ? "ring-2 ring-anamaya-green ring-offset-1"
                : "border-zinc-300 hover:scale-110"
            }`}
            style={{ backgroundColor: hex }}
            aria-label={COLOR_LABELS[key]}
            aria-pressed={selected}
          />
        );
      })}
    </div>
  );
}
