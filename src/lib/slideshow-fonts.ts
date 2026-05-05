/**
 * Curated list of modern Google Fonts suitable for large display text
 * over images and video — what the Image Slideshow block exposes in
 * its font dropdown. Picked for legibility at 60–120 px sizes and
 * current popularity on hospitality / wellness / lifestyle sites.
 *
 * No legacy faces (Times New Roman, Arial, Courier, etc.) — those
 * read as dated for 2026 marketing.
 */

export type SlideshowFont = {
  /** Storage key — what we save on the slide row. */
  id: string;
  /** Human label for the dropdown. */
  label: string;
  /** Browser font-family value. Use this in inline `font-family` style. */
  family: string;
  /** Google Fonts family + axes for the CSS URL builder. */
  gfQuery: string;
  /** Style group — useful for grouping in the dropdown. */
  group: "Sans" | "Display" | "Serif" | "Script";
};

export const SLIDESHOW_FONTS: SlideshowFont[] = [
  // Modern sans — versatile, clean, body-friendly at large sizes too.
  { id: "inter",          label: "Inter",              family: "'Inter', sans-serif",            gfQuery: "Inter:wght@400;700",            group: "Sans" },
  { id: "montserrat",     label: "Montserrat",         family: "'Montserrat', sans-serif",       gfQuery: "Montserrat:wght@400;700",       group: "Sans" },
  { id: "poppins",        label: "Poppins",            family: "'Poppins', sans-serif",          gfQuery: "Poppins:wght@400;700",          group: "Sans" },
  { id: "outfit",         label: "Outfit",             family: "'Outfit', sans-serif",           gfQuery: "Outfit:wght@400;700",           group: "Sans" },
  { id: "plus_jakarta",   label: "Plus Jakarta Sans",  family: "'Plus Jakarta Sans', sans-serif", gfQuery: "Plus+Jakarta+Sans:wght@400;700", group: "Sans" },
  { id: "manrope",        label: "Manrope",            family: "'Manrope', sans-serif",          gfQuery: "Manrope:wght@400;700",          group: "Sans" },
  { id: "sora",           label: "Sora",               family: "'Sora', sans-serif",             gfQuery: "Sora:wght@400;700",             group: "Sans" },

  // Display — high impact, hero-style, looks great over imagery.
  { id: "bebas_neue",     label: "Bebas Neue",         family: "'Bebas Neue', sans-serif",       gfQuery: "Bebas+Neue",                    group: "Display" },
  { id: "anton",          label: "Anton",              family: "'Anton', sans-serif",            gfQuery: "Anton",                         group: "Display" },
  { id: "oswald",         label: "Oswald",             family: "'Oswald', sans-serif",           gfQuery: "Oswald:wght@400;700",           group: "Display" },
  { id: "big_shoulders",  label: "Big Shoulders Display", family: "'Big Shoulders Display', sans-serif", gfQuery: "Big+Shoulders+Display:wght@400;700", group: "Display" },

  // Serif — elegant, editorial, retreat / spa friendly.
  { id: "playfair",       label: "Playfair Display",   family: "'Playfair Display', serif",      gfQuery: "Playfair+Display:wght@400;700", group: "Serif" },
  { id: "dm_serif",       label: "DM Serif Display",   family: "'DM Serif Display', serif",      gfQuery: "DM+Serif+Display",              group: "Serif" },
  { id: "fraunces",       label: "Fraunces",           family: "'Fraunces', serif",              gfQuery: "Fraunces:wght@400;700",         group: "Serif" },
  { id: "cormorant",      label: "Cormorant Garamond", family: "'Cormorant Garamond', serif",    gfQuery: "Cormorant+Garamond:wght@400;700", group: "Serif" },

  // Script — handwritten accent, sparing use.
  { id: "caveat",         label: "Caveat",             family: "'Caveat', cursive",              gfQuery: "Caveat:wght@400;700",           group: "Script" },
];

/** Default font when a slide has no font_id set. */
export const DEFAULT_SLIDESHOW_FONT_ID = "bebas_neue";

/** Look up a font by id; falls back to default. */
export function getSlideshowFont(id: string | undefined | null): SlideshowFont {
  if (id) {
    const found = SLIDESHOW_FONTS.find((f) => f.id === id);
    if (found) return found;
  }
  return SLIDESHOW_FONTS.find((f) => f.id === DEFAULT_SLIDESHOW_FONT_ID)!;
}

/**
 * Build a single Google Fonts CSS URL that loads ALL slideshow fonts
 * in one request. Font files are only fetched on actual use, so the
 * URL can safely include every face — only the ones referenced from
 * inline `font-family` styles end up downloaded.
 */
export function buildGoogleFontsUrl(): string {
  const params = SLIDESHOW_FONTS.map((f) => `family=${f.gfQuery}`).join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
