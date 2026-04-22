"use client";

import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import type { BrandingColors, OrgBranding } from "@/config/brand-tokens";
import {
  BRAND_COLOR_KEYS,
  COLOR_KEY_TO_CSS_VAR,
  COLOR_LABELS,
  STATUS_COLOR_KEYS,
} from "@/config/brand-tokens";

type Props = {
  /** Brand token key ("brandHighlight"), raw hex ("#7aa59e"), or empty for "auto". */
  value: string | undefined;
  onChange: (value: string) => void;
  brandTokens: Required<OrgBranding>;
  keys?: (keyof BrandingColors)[];
  allowAuto?: boolean;
  includeStatus?: boolean;
};

/**
 * Two-mode color picker: Brand CSS swatches (live from AO) OR a custom
 * hex picker with HEX + HSB text inputs. Stores the brand key when a
 * swatch is chosen and a raw hex when a custom color is chosen — both
 * render correctly via resolveBrandColor() in brand-tokens.ts.
 */
export default function BrandColorSelect({
  value,
  onChange,
  brandTokens,
  keys = BRAND_COLOR_KEYS,
  allowAuto = false,
  includeStatus = false,
}: Props) {
  const isBrandKey = !!value && value in COLOR_KEY_TO_CSS_VAR;
  const initialMode: "brand" | "custom" =
    isBrandKey || !value ? "brand" : "custom";
  const [mode, setMode] = useState<"brand" | "custom">(initialMode);
  const initialHex = !isBrandKey && value ? value : "#A35B4E";

  const allKeys = includeStatus ? [...keys, ...STATUS_COLOR_KEYS] : keys;

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="inline-flex rounded-md border border-zinc-300 bg-white p-0.5 text-[11px] font-semibold uppercase tracking-wider">
        <button
          type="button"
          onClick={() => setMode("brand")}
          className={`rounded-sm px-3 py-1 transition-colors ${
            mode === "brand"
              ? "bg-anamaya-charcoal text-white"
              : "text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
          }`}
        >
          Brand CSS
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`rounded-sm px-3 py-1 transition-colors ${
            mode === "custom"
              ? "bg-anamaya-charcoal text-white"
              : "text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
          }`}
        >
          Custom
        </button>
      </div>

      {mode === "brand" ? (
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
      ) : (
        <CustomColorPicker
          value={!isBrandKey && value ? value : initialHex}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function CustomColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  // Normalise to 6-char hex for the picker (it doesn't accept 3-char).
  const normalisedHex = normaliseHex(value);
  const hsb = hexToHsb(normalisedHex);
  const [hexText, setHexText] = useState(normalisedHex);
  const [hsbText, setHsbText] = useState(`${hsb.h}, ${hsb.s}, ${hsb.b}`);

  function commitHex(raw: string) {
    const clean = normaliseHex(raw);
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      onChange(clean);
      setHexText(clean);
      const h = hexToHsb(clean);
      setHsbText(`${h.h}, ${h.s}, ${h.b}`);
    } else {
      // Invalid — revert text to the last-good value.
      setHexText(value);
    }
  }

  function commitHsb(raw: string) {
    const parts = raw.split(/[\s,]+/).map((s) => Number(s.trim()));
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
      setHsbText(`${hsb.h}, ${hsb.s}, ${hsb.b}`);
      return;
    }
    const [h, s, b] = parts;
    const hex = hsbToHex(
      clamp(h, 0, 360),
      clamp(s, 0, 100),
      clamp(b, 0, 100),
    );
    onChange(hex);
    setHexText(hex);
    setHsbText(`${Math.round(h)}, ${Math.round(s)}, ${Math.round(b)}`);
  }

  return (
    <div className="flex flex-wrap items-start gap-4 rounded-md border border-zinc-200 bg-white p-3">
      <div className="flex-shrink-0">
        <HexColorPicker
          color={normalisedHex}
          onChange={(hex) => {
            onChange(hex);
            setHexText(hex);
            const h = hexToHsb(hex);
            setHsbText(`${h.h}, ${h.s}, ${h.b}`);
          }}
          style={{ width: 180, height: 140 }}
        />
      </div>
      <div className="flex flex-col gap-2 text-xs">
        <label className="flex items-center gap-2">
          <span className="w-10 font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
            Hex
          </span>
          <input
            type="text"
            value={hexText}
            onChange={(e) => setHexText(e.target.value)}
            onBlur={(e) => commitHex(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitHex((e.target as HTMLInputElement).value);
              }
            }}
            className="w-28 rounded border border-zinc-300 px-2 py-1 font-mono text-[11px]"
            placeholder="#RRGGBB"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="w-10 font-semibold uppercase tracking-wider text-anamaya-charcoal/60">
            HSB
          </span>
          <input
            type="text"
            value={hsbText}
            onChange={(e) => setHsbText(e.target.value)}
            onBlur={(e) => commitHsb(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitHsb((e.target as HTMLInputElement).value);
              }
            }}
            className="w-28 rounded border border-zinc-300 px-2 py-1 font-mono text-[11px]"
            placeholder="H, S, B"
          />
        </label>
        <div className="mt-1 flex items-center gap-2">
          <div
            className="h-6 w-6 rounded border border-zinc-300"
            style={{ backgroundColor: normalisedHex }}
          />
          <span className="font-mono text-[11px] text-anamaya-charcoal/60">
            {normalisedHex}
          </span>
        </div>
      </div>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function normaliseHex(input: string): string {
  const s = input.trim().replace(/^#?/, "");
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return "#" + s.split("").map((c) => c + c).join("").toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) return "#" + s.toLowerCase();
  return input; // leave untouched; caller may reject
}

function hexToHsb(hex: string): { h: number; s: number; b: number } {
  const clean = normaliseHex(hex).replace("#", "");
  if (!/^[0-9a-f]{6}$/.test(clean)) return { h: 0, s: 0, b: 0 };
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const bl = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, bl);
  const min = Math.min(r, g, bl);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - bl) / d) % 6);
    else if (max === g) h = 60 * ((bl - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return { h: Math.round(h), s: Math.round(s * 100), b: Math.round(max * 100) };
}

function hsbToHex(h: number, s: number, b: number): string {
  const S = s / 100;
  const V = b / 100;
  const k = (n: number) => (n + h / 60) % 6;
  const f = (n: number) => V - V * S * Math.max(0, Math.min(k(n), 4 - k(n), 1));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
}
