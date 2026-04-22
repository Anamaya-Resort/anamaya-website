/**
 * Brand tokens — mirrored 1:1 from AnamayaOS (/src/config/branding-defaults.ts).
 * Source of truth is AO's `org_branding` Supabase row (org_slug='default'),
 * which this file's DEFAULT_BRANDING falls back to when a value isn't set.
 *
 * Keep this file in structural sync with AO's. If AO adds a token key here
 * too — we read the same JSONB shape.
 */

export interface BrandingColors {
  brand?: string;
  brandSubtle?: string;
  brandBtn?: string;
  brandBtnHover?: string;
  brandBtnText?: string;
  brandHighlight?: string;
  brandDivider?: string;
  brandMuted?: string;
  destructive?: string;
  success?: string;
  warning?: string;
  info?: string;
}

export const BLEND_MODES = [
  "normal", "multiply", "screen", "overlay", "darken", "lighten",
  "color-dodge", "color-burn", "hard-light", "soft-light",
  "difference", "exclusion", "hue", "saturation", "color", "luminosity",
] as const;
export type BlendMode = typeof BLEND_MODES[number];

export interface OrgBranding {
  light: BrandingColors;
  dark: BrandingColors;
  fontHeading?: string;
  fontBody?: string;
  radius?: number;
  btnFxStrength?: number;
  btnFxSpeed?: number;
  btnFxSoundEnabled?: boolean;
  backgroundColor?: string;
  backgroundColorDark?: string;
  backgroundImageUrl?: string;
  backgroundOpacity?: number;
  backgroundBlendMode?: BlendMode;
}

export const DEFAULT_BRANDING: Required<OrgBranding> = {
  light: {
    brand:          "#FFFFFF",
    brandSubtle:    "#F5F7ED",
    brandBtn:       "#A35B4E",
    brandBtnHover:  "#8A4D42",
    brandBtnText:   "#FFFFFF",
    brandHighlight: "#A0BF52",
    brandDivider:   "#9CB5B1",
    brandMuted:     "#808080",
    destructive:    "#ef4444",
    success:        "#22c55e",
    warning:        "#f59e0b",
    info:           "#3b82f6",
  },
  dark: {
    brand:          "#1a1a1a",
    brandSubtle:    "#242420",
    brandBtn:       "#C06B5E",
    brandBtnHover:  "#D47D70",
    brandBtnText:   "#FFFFFF",
    brandHighlight: "#A0BF52",
    brandDivider:   "#4a5f5c",
    brandMuted:     "#666666",
    destructive:    "#f87171",
    success:        "#4ade80",
    warning:        "#fbbf24",
    info:           "#60a5fa",
  },
  fontHeading: "Inter",
  fontBody: "Inter",
  radius: 5,
  btnFxStrength: 0.4,
  btnFxSpeed: 1,
  btnFxSoundEnabled: true,
  backgroundColor: "#ffffff",
  backgroundColorDark: "#1a1a1a",
  backgroundImageUrl: "",
  backgroundOpacity: 1,
  backgroundBlendMode: "normal" as BlendMode,
};

/** CSS variable name for each color key — matches AO's globals.css. */
export const COLOR_KEY_TO_CSS_VAR: Record<keyof BrandingColors, string> = {
  brand:          "--brand",
  brandSubtle:    "--brand-subtle",
  brandBtn:       "--brand-btn",
  brandBtnHover:  "--brand-btn-hover",
  brandBtnText:   "--brand-btn-text",
  brandHighlight: "--brand-highlight",
  brandDivider:   "--brand-divider",
  brandMuted:     "--brand-muted",
  destructive:    "--destructive",
  success:        "--success",
  warning:        "--warning",
  info:           "--info",
};

export const COLOR_LABELS: Record<keyof BrandingColors, string> = {
  brand:          "Background",
  brandSubtle:    "Subtle Background",
  brandBtn:       "Primary Button",
  brandBtnHover:  "Button Hover",
  brandBtnText:   "Button Text",
  brandHighlight: "Highlight/Accent",
  brandDivider:   "Borders/Dividers",
  brandMuted:     "Muted Text",
  destructive:    "Destructive/Error",
  success:        "Success",
  warning:        "Warning",
  info:           "Info/Selection",
};

/** Keys shown in block-editor color pickers (decorative palette). */
export const BRAND_COLOR_KEYS: (keyof BrandingColors)[] = [
  "brand",
  "brandSubtle",
  "brandBtn",
  "brandBtnHover",
  "brandBtnText",
  "brandHighlight",
  "brandDivider",
  "brandMuted",
];

/** Keys for status-message colors — not for decorative use. */
export const STATUS_COLOR_KEYS: (keyof BrandingColors)[] = [
  "destructive",
  "success",
  "warning",
  "info",
];

/**
 * Font families available on the marketing site. Next/font already loads
 * these in the root layout; we just expose keys for block editors to pick
 * from. The cssClass references Tailwind's `font-sans` / `font-heading`
 * which map to --font-inter / --font-oswald in globals.css.
 *
 * If AO adds more font choices later, extend this list and update
 * layout.tsx's next/font registrations.
 */
export type BrandFontKey = "body" | "heading";

export const BRAND_FONTS: { key: BrandFontKey; label: string; cssClass: string; family: string }[] = [
  { key: "body",    label: "Body (Inter)",     cssClass: "font-sans",    family: "Inter" },
  { key: "heading", label: "Display (Oswald)", cssClass: "font-heading", family: "Oswald" },
];

/**
 * Resolve a brand color value (either a token key like "brandHighlight" or
 * a raw CSS color) into a CSS value suitable for `style={{ color: ... }}`.
 * Returns `undefined` for empty/missing values so callers can fall back.
 */
export function resolveBrandColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // Brand token key — use the CSS var so live AO changes propagate.
  if (value in COLOR_KEY_TO_CSS_VAR) {
    const v = COLOR_KEY_TO_CSS_VAR[value as keyof BrandingColors];
    return `var(${v})`;
  }
  // Legacy preset names from the first press-bar implementation.
  const legacy: Record<string, string> = {
    "teal-muted": "var(--brand-divider)",
    "mint":       "#b8d3cf",
    "cream":      "var(--brand-subtle)",
    "white":      "var(--brand)",
    "charcoal":   "#444444",
  };
  if (value in legacy) return legacy[value];
  // Otherwise treat as raw CSS color (hex, rgb, named).
  return value;
}


/** Deep-merge defaults with partial overrides (light/dark merge field-by-field). */
export function mergeBranding(
  defaults: Required<OrgBranding>,
  overrides: Partial<OrgBranding>,
): Required<OrgBranding> {
  return {
    light: { ...defaults.light, ...overrides.light },
    dark:  { ...defaults.dark,  ...overrides.dark  },
    fontHeading:         overrides.fontHeading         ?? defaults.fontHeading,
    fontBody:            overrides.fontBody            ?? defaults.fontBody,
    radius:              overrides.radius              ?? defaults.radius,
    btnFxStrength:       overrides.btnFxStrength       ?? defaults.btnFxStrength,
    btnFxSpeed:          overrides.btnFxSpeed          ?? defaults.btnFxSpeed,
    btnFxSoundEnabled:   overrides.btnFxSoundEnabled   ?? defaults.btnFxSoundEnabled,
    backgroundColor:     overrides.backgroundColor     ?? defaults.backgroundColor,
    backgroundColorDark: overrides.backgroundColorDark ?? defaults.backgroundColorDark,
    backgroundImageUrl:  overrides.backgroundImageUrl  ?? defaults.backgroundImageUrl,
    backgroundOpacity:   overrides.backgroundOpacity   ?? defaults.backgroundOpacity,
    backgroundBlendMode: overrides.backgroundBlendMode ?? defaults.backgroundBlendMode,
  };
}
