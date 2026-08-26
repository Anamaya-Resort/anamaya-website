// Content schemas for each block type. Stored as jsonb in blocks.content
// (or block_usages.override_content for per-usage overrides).

import type { LayoutWidthsContent } from "@/lib/layout-widths";

export type RichTextContent = LayoutWidthsContent & SectionFrame & {
  html: string;
  bg_color?: string;
  text_color?: string;
  padding_y_px?: number;
};

/**
 * A horizontal "band" sitting above or below the hero video. Optional;
 * the band disappears entirely when `enabled` is false.
 *
 * Text is plain text with uniform formatting controls. Colors can be
 * either a brand-token key (preferred — updates live when AO branding
 * changes) or a raw hex.
 */
export type HeroBandContent = {
  enabled?: boolean;
  height_px?: number;
  bg_color?: string;
  text?: string;
  text_font?: "body" | "heading";
  text_size_px?: number;
  text_bold?: boolean;
  text_italic?: boolean;
  text_color?: string;
};

/**
 * Hero With Video block. Structure: optional top band, video, optional
 * bottom band. Video can be either a YouTube URL/ID (embedded via iframe)
 * or an uploaded MP4 stored in Supabase Storage.
 */
export type HeroContent = {
  video_source?: "youtube" | "upload";
  /** Either a full YouTube URL or just the 11-char video id. */
  youtube_url?: string;
  /** Public URL of an uploaded video file. */
  video_url?: string;
  /** Optional poster image shown before the video plays. */
  video_poster_url?: string;
  /** Alt text for the poster image. */
  video_poster_alt?: string;
  /**
   * Display mode:
   * - "aspect": 16:9 player with controls, no autoplay (inline article video).
   * - "cover":  full-viewport background; autoplays muted, loops, no controls.
   *   Used for homepage-style hero sections.
   */
  fit?: "aspect" | "cover";
  /** When fit=cover, section height in vh. Default 80. */
  height_vh?: number;
  /** Darkening overlay 0-100. Default 0. Applied in cover mode for contrast. */
  overlay_opacity?: number;
  top?: HeroBandContent;
  bottom?: HeroBandContent;
  /**
   * SEO metadata emitted as schema.org VideoObject JSON-LD. Crawlers like
   * Google Video use this to understand the video. Analogous to alt text
   * for images — not user-visible, but essential for discoverability.
   */
  seo_title?: string;
  seo_description?: string;
  /** ISO-8601 date string, e.g. "2024-06-01". */
  seo_upload_date?: string;
  /** Runtime in seconds; emitted as ISO-8601 duration (PT…S). */
  seo_duration_seconds?: number;
  /**
   * Optional caption drawn OVER the cover image (fit="cover" only). Purely
   * additive and opt-in: when `enabled` is false (or unset), or no text
   * fields are filled, nothing extra renders — existing heroes are
   * untouched. Sits above the darkening overlay for legibility.
   */
  caption?: {
    enabled?: boolean;
    kicker?: string;
    title?: string;
    subtitle?: string;
    button_label?: string;
    button_href?: string;
    align?: "left" | "center";
    /** Brand-token key or hex. Default white. */
    text_color?: string;
  };
};

export type CtaBannerContent = LayoutWidthsContent & {
  heading: string;
  subheading?: string;
  bg_color?: string;          // brand token or hex; shown when no bg image
                              // OR behind a translucent / blended image
  bg_image_url?: string;
  image_alt?: string;
  /** 0–100. Default 100 (fully opaque). Lower values let the bg colour
   *  show through. Applied to the image layer only. */
  bg_image_opacity?: number;
  /** CSS mix-blend-mode for the image layer. Default "normal". */
  bg_image_blend_mode?:
    | "normal"
    | "multiply"
    | "screen"
    | "overlay"
    | "darken"
    | "lighten"
    | "color-dodge"
    | "color-burn"
    | "hard-light"
    | "soft-light"
    | "difference"
    | "exclusion"
    | "hue"
    | "saturation"
    | "color"
    | "luminosity";
  cta?: { label: string; href: string };
};

/** CSS mix-blend-mode values supported across image-bearing blocks. */
export type BlockBlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

export type CardSizeUnit = "pct" | "px";

/**
 * Small Form Over Image — full-width banner with an embedded Sereenly
 * form sitting on a centred (or aligned) "card" rectangle. Used for
 * email-capture sections that need more than just the email field
 * (first/last name + phone + email).
 *
 * Layered structure:
 *
 *   Banner section (full width × banner_height_px)
 *     ├─ Background colour
 *     ├─ Optional background image (opacity + mix-blend-mode)
 *     └─ Card (positioned by horizontal_align + vertical_align)
 *          ├─ Card background colour (always 100 % opaque)
 *          ├─ Optional card background image (opacity + blend mode
 *          │   that paints OVER the card colour, not the banner)
 *          ├─ Heading
 *          ├─ Subheading
 *          └─ Sereenly form (form_id)
 *
 * Card size accepts either % of the banner or fixed px per axis,
 * so editors can mix "card is 480 px wide × 70 % tall" if they want.
 */
export type SmallFormOverImageContent = {
  // Banner (outer)
  banner_height_px?: number;
  bg_color?: string;
  bg_image_url?: string;
  bg_image_alt?: string;
  bg_image_opacity?: number;          // 0–100
  bg_image_blend_mode?: BlockBlendMode;

  // Card (inner rectangle) — size + alignment
  card_width_value?: number;
  card_width_unit?: CardSizeUnit;
  card_height_value?: number;
  card_height_unit?: CardSizeUnit;
  card_horizontal_align?: "left" | "center" | "right";
  card_vertical_align?: "top" | "center" | "bottom";
  card_corner_radius_px?: number;
  card_padding_px?: number;

  // Card background
  card_bg_color?: string;
  card_bg_image_url?: string;
  card_bg_image_alt?: string;
  card_bg_image_opacity?: number;     // 0–100
  card_bg_image_blend_mode?: BlockBlendMode;

  // Card content text
  heading?: string;
  heading_font?: "body" | "heading";
  heading_size_px?: number;
  heading_color?: string;
  heading_bold?: boolean;
  heading_italic?: boolean;

  subheading?: string;
  subheading_font?: "body" | "heading";
  subheading_size_px?: number;
  subheading_color?: string;

  // Form
  form_id?: string;                   // Sereenly form id
  form_name?: string;                 // analytics label
  form_height_px?: number;            // initial iframe height
};

export type PressBarLogo = {
  name: string;
  src: string;
  width: number;
  height: number;
  href?: string | null;
  /** Featured logos take 2x width in the grid. */
  featured?: boolean;
  /** Per-logo visual size tweak relative to the cell-width default
   *  (set by weight). Editor offers ±5% buttons; e.g. -10 shrinks
   *  the logo to 90%, +5 enlarges to 105%. Defaults to 0. */
  size_adjust_pct?: number;
};

/**
 * @deprecated Legacy preset names from the first press-bar implementation.
 * New data stores brand-token keys (e.g. "brandSubtle") instead. Kept so
 * older rows still render via resolveBrandColor() in brand-tokens.ts.
 */
export type PressBarBgPreset = "teal-muted" | "mint" | "cream" | "white" | "charcoal" | "custom";

export type PressBarContent = {
  heading?: string;
  /** Explicit grid column widths (percent). Must sum to 100. Default: 9 logos × 10% with a 20% featured slot. */
  column_widths_pct?: number[];
  logos: PressBarLogo[];
  /**
   * Background color. Stored as either a brand-token key ("brandSubtle",
   * "brandHighlight", ...) or — for legacy rows — the old preset name.
   * Resolved via resolveBrandColor() so AO brand edits propagate live.
   */
  bg_color?: string;
  /** @deprecated Old "custom" path — kept so legacy rows keep rendering. */
  bg_color_custom?: string;
  /** Brand-token key for heading text color. Blank means "auto" (contrast-aware). */
  heading_color?: string;
  /** Brand font key for the heading ("body" | "heading"). Defaults to "heading". */
  heading_font?: "body" | "heading";
  /** Regular-logo max height in px (default 48). Featured logos get 2× this. */
  logo_height_px?: number;
  /**
   * Section min-height in px. Content (heading + logos) is centered
   * vertically within it. When omitted the section sizes to its content
   * plus default padding. Default 200.
   */
  section_height_px?: number;
  /** Left gutter weight in % (default 5). The bar fills the full
   *  viewport width with this much weight as empty space on the left
   *  before the logos start. Treated as a fr unit alongside the
   *  per-logo weights, so non-100 totals normalise proportionally
   *  rather than break the layout. */
  left_gutter_pct?: number;
  /** Right gutter weight in % (default 5). Same semantics as
   *  left_gutter_pct, applied after the last logo. */
  right_gutter_pct?: number;
  /** Uniform horizontal gap between every column (gutters + logos),
   *  in pixels. Default 16. Replaces the previous per-cell padding. */
  gap_px?: number;
  /** Heading font size in px. Default 14 (matches Tailwind text-sm). */
  heading_size_px?: number;
  /** Vertical gap between the heading and the logo row, in px.
   *  Default 24 (matches the previous mb-6). */
  heading_gap_px?: number;
};

// ─── NEW HOMEPAGE BLOCKS ──────────────────────────────────────────────

/**
 * Optional Call-To-Action button rendered at the bottom of a block.
 * Disabled by default — editors surface a checkbox. Same shape used
 * everywhere so the renderer and editor can be reused.
 */
export type BlockCta = {
  cta_enabled?: boolean;
  cta_label?: string;
  cta_href?: string;
  /** Brand token key or hex. */
  cta_bg_color?: string;
  /** Brand token key or hex. */
  cta_text_color?: string;
  cta_size_px?: number;
  cta_font?: "body" | "heading";
};

/**
 * Section frame mixin — gives any block a constrained centered content
 * area inside a full-bleed section, plus an optional decorative overlay
 * (botanical illustration, ornament, etc.) anchored to a corner that
 * can bleed past the content edge.
 *
 * Pattern: section is full-width with bg, content is constrained to
 * `content_width_px`, decoration is absolutely positioned to the section
 * (so it can bleed). Mobile hides the decoration by default to keep
 * the content centered and prominent.
 */
export type SectionFrame = {
  /** Inner content max-width in px (desktop). Falls back to a per-block default. */
  content_width_px?: number;
  /** Decoration image URL (PNG with alpha works best). */
  decoration_url?: string;
  decoration_alt?: string;
  decoration_position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "left-center"
    | "right-center";
  /** Max width in px. Default 240. */
  decoration_size_px?: number;
  /** 0-100. Default 100. */
  decoration_opacity?: number;
  decoration_flip_x?: boolean;
  decoration_flip_y?: boolean;
  /**
   * Offset in px from the anchor edge. Negative values push the
   * decoration off-screen (the bleed effect — section overflow is hidden
   * so anything past the edge gets clipped).
   */
  decoration_offset_x_px?: number;
  decoration_offset_y_px?: number;
  /**
   * Show decoration on mobile? Default false — mobile prioritizes the
   * content area; decorations would crowd it.
   */
  decoration_show_mobile?: boolean;
};

/** Rich Text with Background — any HTML on a branded background. */
export type RichBgContent = LayoutWidthsContent & BlockCta & SectionFrame & {
  html?: string;
  bg_color?: string;                           // brand key or hex
  bg_image_url?: string;                       // optional background image
  bg_image_fit?: "cover" | "contain" | "tile"; // scaling mode
  /** 10-200. Background image scale (CSS bg-size %). 100 = natural fit. */
  bg_image_scale_pct?: number;
  text_color?: string;                         // brand key or hex
  padding_y_px?: number;                       // vertical padding (default 48)
};

/** Video Showcase — solid-bg block with optional titles above and below. */
export type VideoShowcaseContent = LayoutWidthsContent & BlockCta & {
  bg_color?: string;
  padding_y_px?: number;
  // Titles
  title_top?: string;
  title_top_font?: "body" | "heading";
  title_top_size_px?: number;
  title_top_color?: string;
  title_top_bold?: boolean;
  title_top_italic?: boolean;
  title_bottom?: string;
  title_bottom_font?: "body" | "heading";
  title_bottom_size_px?: number;
  title_bottom_color?: string;
  title_bottom_bold?: boolean;
  title_bottom_italic?: boolean;
  // Video (same fields as Hero)
  video_source?: "youtube" | "upload";
  youtube_url?: string;
  video_url?: string;
  video_poster_url?: string;
  video_poster_alt?: string;
  /** Max width of the video frame in px (default 800). */
  video_max_width_px?: number;
};

/** Double-row checklist. */
export type ChecklistItem = { text: string };
export type ChecklistContent = LayoutWidthsContent & BlockCta & SectionFrame & {
  heading?: string;
  heading_font?: "body" | "heading";
  heading_color?: string;
  heading_size_px?: number;
  bg_color?: string;
  text_color?: string;
  text_size_px?: number;
  columns_top?: ChecklistItem[];
  columns_bottom?: ChecklistItem[];
  padding_y_px?: number;
};

/** Newsletter signup. The form POSTs to form_action_url (optional). */
export type NewsletterContent = LayoutWidthsContent & {
  bg_color?: string;
  heading?: string;
  heading_font?: "body" | "heading";
  heading_color?: string;
  heading_size_px?: number;
  description?: string;
  description_color?: string;
  description_size_px?: number;
  input_placeholder?: string;
  submit_label?: string;
  submit_color?: string;       // brand key or hex
  form_action_url?: string;
  padding_y_px?: number;
};

/** Full-width image with 3 lines of text overlaid. Each line fully styled. */
export type ImageOverlayLine = {
  text?: string;
  font?: "body" | "heading";
  size_px?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
};
export type ImageOverlayContent = BlockCta & {
  image_url?: string;
  image_alt?: string;
  /** Corner radius in px applied to the whole section. 0/undefined (default)
   *  = square — most heroes bleed to the page edge and should stay square.
   *  Opt in only when the block sits inside a contained column next to
   *  other rounded cards (e.g. a retreat template's main column). */
  corner_radius_px?: number;
  /**
   * How the image fills the section:
   *  - "cover"   (default): fill the section, crop edges to match aspect
   *  - "contain": show the whole image, letterbox/pillarbox to fit
   */
  image_fit?: "cover" | "contain";
  /** Mirror the image left-to-right. */
  image_flip_x?: boolean;
  /** Mirror the image top-to-bottom. */
  image_flip_y?: boolean;
  /**
   * Scale the image inside its frame. 100 = natural fit, 80 = 80%,
   * 120 = 120% (may overflow / be cropped by the section's overflow:
   * hidden). Default 100.
   */
  image_scale_pct?: number;
  /** Background behind the image — useful when the image has
   *  transparency or when image_fit=contain leaves empty space.
   *  Empty string / undefined = transparent. */
  bg_color?: string;
  height_px?: number;
  overlay_opacity?: number;   // 0-100 darkening overlay
  line_1?: ImageOverlayLine;
  line_2?: ImageOverlayLine;
  line_3?: ImageOverlayLine;
  /** Content alignment within the section. */
  align?: "left" | "center" | "right";
};

/** Image + text split with configurable column ratio. */
export type ImageTextContent = BlockCta & {
  // ── Container (outer section dimensions + column layout) ────────────
  /** Max width of the section in px. Default 1400. */
  container_width_px?: number;
  /** Fixed height of the section in px. 0/undefined = auto (sizes
   *  to content; padding_y_px fills the rest). */
  container_height_px?: number;
  image_side?: "left" | "right";
  /** Image column width, 25-75. */
  image_width_pct?: number;
  vertical_align?: "top" | "center" | "bottom";
  /** Horizontal alignment of the image inside its own column. Default
   *  "center". Useful when the visual centre of the image differs from
   *  its bounding-box centre — e.g. setting "right" pushes a left-side
   *  image toward the text column for a more balanced look. */
  image_horizontal_align?: "left" | "center" | "right";
  bg_color?: string;

  // ── Image (fits inside its column, never cropped) ───────────────────
  image_url?: string;
  image_alt?: string;
  /** 10-100. Image max-size as a % of the image column. Always fits. */
  image_scale_pct?: number;
  /** Mirror the image left-to-right. */
  image_flip_x?: boolean;
  /** Mirror the image top-to-bottom. */
  image_flip_y?: boolean;
  /** Corner radius in px applied to the image. 0 = squared, default 0
   *  (preserves existing blocks that haven't been touched). */
  image_corner_radius_px?: number;

  // ── Text ────────────────────────────────────────────────────────────
  html?: string;
  text_color?: string;

  // ── Deprecated: replaced by container_height_px when that's set ─────
  padding_y_px?: number;
};

/**
 * Google Map with Text — sibling of ImageTextContent, but the
 * image-side cell is an embedded Google Map iframe instead of an
 * `<img>`. All the layout controls (container width / height, side
 * left vs right, column-width %, vertical + horizontal align,
 * background, text HTML, padding) match ImageText so the two feel
 * interchangeable as page-builder primitives.
 *
 * Map embed uses Google's keyless `output=embed` URL so no API key
 * is needed. The map remains interactive (zoom + pan); a small
 * "Open in Google Maps ↗" link sits in the bottom-right corner so
 * the user can launch the full Google Maps tab in a new window.
 */
export type GoogleMapTextContent = BlockCta & {
  // ── Container (outer section dimensions + column layout) ────────────
  container_width_px?: number;        // default 1400
  container_height_px?: number;       // default 0 = auto
  map_side?: "left" | "right";        // default "left"
  map_width_pct?: number;             // 25–75; default 40
  vertical_align?: "top" | "center" | "bottom";
  bg_color?: string;
  /** Horizontal alignment of the map inside its column. Default "center". */
  map_horizontal_align?: "left" | "center" | "right";

  // ── Map ─────────────────────────────────────────────────────────────
  lat?: number;                       // default 9.6483 (Montezuma, CR)
  lng?: number;                       // default -85.0696
  zoom?: number;                      // 0–21; default 14
  marker_label?: string;              // shown on the embed pin + open link
  open_label?: string;                // corner-link text; default "Open in Google Maps ↗"
  map_corner_radius_px?: number;      // default 0
  /** Custom embed iframe src (e.g. a Google My Maps ".../maps/d/embed?mid=…"
   *  URL). When set it OVERRIDES the computed single-pin embed — used for
   *  custom maps with multiple routes/markers. */
  embed_url?: string;
  /** Show the map full-width with no text column (large + centered). */
  full_width_map?: boolean;
  /** Flank the (full-width) map left & right with a decorative bracket at
   *  50% opacity. */
  flower_frame?: boolean;
  /** Bracket image (e.g. a horizontal flower-divider). Rotated 90° into
   *  vertical side pieces, mirrored left/right. Empty = sideways-flower motif. */
  frame_image_url?: string;
  /** CSS filter applied to the bracket image, e.g. to recolor a green
   *  divider to dark grey: "brightness(0) invert(0.28)". */
  frame_filter?: string;

  // ── Text ────────────────────────────────────────────────────────────
  html?: string;
  text_color?: string;

  // ── Padding (matches ImageText) ─────────────────────────────────────
  padding_y_px?: number;              // used when container_height_px = 0
};

// ─── GENERAL-PURPOSE BLOCKS (used by retreats + other pages) ──────────

/**
 * Divider — a thin horizontal break between sections. Three variants:
 *   - "rule":     a centered horizontal line
 *   - "ornament": a centered SVG/image flourish (used by the legacy WP
 *                 retreat template's flower divider)
 *   - "spacer":   blank vertical space, no visible mark
 */
export type DividerContent = {
  variant?: "rule" | "ornament" | "spacer";
  /** Total vertical space in px (default 48). */
  spacing_px?: number;
  /** Brand-token key or hex; only meaningful for "rule" / "ornament". */
  color?: string;
  /** For "ornament": image URL of the flourish; falls back to a built-in SVG. */
  ornament_url?: string;
  /** For "ornament": max width of the ornament in px (default 80). */
  ornament_width_px?: number;
  bg_color?: string;
};

/**
 * Quote / testimonial. Three layout variants:
 *   - "card":   bordered card, photo + name on the side
 *   - "pull":   large centered pull-quote, no photo
 *   - "banner": full-width with optional bg color/image
 */
export type QuoteContent = LayoutWidthsContent & BlockCta & SectionFrame & {
  quote: string;
  attribution?: string;
  attribution_role?: string;
  photo_url?: string;
  photo_alt?: string;
  variant?: "card" | "pull" | "banner";
  bg_color?: string;
  text_color?: string;
  padding_y_px?: number;
};

/**
 * Date range / dates pill. Renders a formatted date range with optional
 * label ("Dates:", "Retreat dates:"). When dates are missing falls back
 * to fallback_text (e.g. "Custom dates available year-round").
 */
export type DateRangeContent = LayoutWidthsContent & {
  label?: string;
  /** ISO-8601 date string (YYYY-MM-DD). */
  start_date?: string;
  /** ISO-8601 date string (YYYY-MM-DD). */
  end_date?: string;
  fallback_text?: string;
  bg_color?: string;
  text_color?: string;
  align?: "left" | "center" | "right";
  size_px?: number;
  padding_y_px?: number;
};

/** Pricing table — N tiers of "name + price + note". */
export type PricingTier = {
  name: string;
  price?: string;            // raw string so "Sold out", "From $1,234" etc all work
  currency?: string;
  note?: string;
  highlight?: boolean;       // visual emphasis (the "best value" tier)
};
export type PricingTableContent = LayoutWidthsContent & BlockCta & SectionFrame & {
  heading?: string;
  intro?: string;
  tiers: PricingTier[];
  footnote?: string;
  /** Force a specific column count; default = number of tiers (auto-fits). */
  columns?: 1 | 2 | 3 | 4;
  bg_color?: string;
  text_color?: string;
  padding_y_px?: number;
};

/**
 * Feature / inclusions list. A list of items each with a title +
 * optional description, price, image, icon. Three layouts:
 *   - "stack": vertical list, full width
 *   - "grid":  N-column responsive grid
 *   - "split": image on alternating sides per item
 */
export type FeatureListItem = {
  title: string;
  description?: string;
  price?: string;
  /** Brand-token key or hex; only meaningful for icon variant. */
  icon?: "check" | "star" | "heart" | "leaf" | "sparkle" | "dot";
  /** @deprecated Per-item marker — superseded by section-level
   *  `FeatureListContent.marker_emoji`. Still read by the renderer as
   *  a legacy fallback so older block content keeps working. */
  marker_emoji?: string;
  image_url?: string;
  image_alt?: string;
  href?: string;
  /** Column assignment when the parent FeatureListContent has
   *  stack_columns = 2. Items default to column 1 if unset. */
  column?: 1 | 2;
};
export type FeatureListContent = LayoutWidthsContent & BlockCta & SectionFrame & {
  heading?: string;
  intro?: string;
  items: FeatureListItem[];
  layout?: "stack" | "grid" | "split";
  /** For "grid" layout: 2-4 columns (default 3). */
  columns?: 2 | 3 | 4;
  /** For "stack" layout: 1 or 2 side-by-side columns (default 1).
   *  When 2, each item's `column` field decides which side it lands on. */
  stack_columns?: 1 | 2;
  /** One emoji applied as the bullet to every item in the list (e.g.
   *  "✓", "•", "🍃", or any pasted emoji). When empty, the renderer
   *  falls back to legacy per-item `marker_emoji` / `icon` for older
   *  data. The editor surfaces this once at the section level — items
   *  no longer carry their own. */
  marker_emoji?: string;
  bg_color?: string;
  text_color?: string;
  padding_y_px?: number;
};

/** Image gallery — uniform grid, masonry, or single-row carousel. */
export type GalleryImage = {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  caption?: string;
};
export type GalleryContent = LayoutWidthsContent & SectionFrame & {
  heading?: string;
  images: GalleryImage[];
  layout?: "grid" | "masonry" | "carousel";
  columns?: 2 | 3 | 4 | 5;
  /** Click image to open full-size in a lightbox. Default true. */
  lightbox?: boolean;
  bg_color?: string;
  padding_y_px?: number;
};

/**
 * Room Grid — the accommodations index. Cards are 100% live from AnamayaOS
 * `rooms` (see src/lib/rooms.ts); this content only holds display settings.
 */
export type RoomGridContent = LayoutWidthsContent & SectionFrame & {
  heading?: string;
  intro?: string;
  bg_color?: string;
  padding_y_px?: number;
};

/**
 * Room Detail — a single accommodation page. WHICH room to show is resolved
 * server-side from the page it renders on (pageId -> url_inventory.url_path
 * -> AnamayaOS rooms.slug), not from this content — so the same block
 * instance serves all 14 room pages. This content only holds display
 * settings.
 */
export type RoomDetailContent = LayoutWidthsContent & {
  bg_color?: string;
  padding_y_px?: number;
};

/**
 * Person card — used for retreat-leader, teacher, guest-speaker bios.
 * Composes a photo + name + credentials line + rich-text body + link.
 * "side-by-side" puts the photo to the left of the text; "stacked"
 * centers the photo above the text.
 */
export type PersonCardContent = LayoutWidthsContent & BlockCta & SectionFrame & {
  name: string;
  photo_url?: string;
  photo_alt?: string;
  credentials?: string;        // single line under name (RYT-500, "Founder", etc.)
  html?: string;               // rich-text bio
  link_label?: string;
  link_href?: string;
  layout?: "side-by-side" | "stacked";
  /** For side-by-side: photo column width 20-50% (default 30). */
  photo_width_pct?: number;
  bg_color?: string;
  text_color?: string;
  padding_y_px?: number;
};

/**
 * Raw HTML escape hatch — for one-off legacy markup (custom tables,
 * embedded scripts) that doesn't fit any other block. Sanitized at
 * render time. Use sparingly; prefer a typed block when possible.
 */
export type RawHtmlContent = LayoutWidthsContent & {
  html: string;
  bg_color?: string;
  padding_y_px?: number;
};

/**
 * Two-column layout primitive. Each side carries another block type's
 * content (rich_text, pricing_table, feature_list, quote, date_range).
 * The renderer dispatches recursively into BlockRenderer for each side,
 * so each side renders identically to its standalone block type.
 *
 * Optional shared CTA renders below both columns, full-width.
 */
export type TwoColumnChildSlug =
  | "rich_text"
  | "pricing_table"
  | "feature_list"
  | "quote"
  | "date_range"
  | "raw_html";

export type TwoColumnSide = {
  type_slug: TwoColumnChildSlug;
  content: unknown;
};

export type TwoColumnContent = BlockCta & SectionFrame & {
  left?: TwoColumnSide;
  right?: TwoColumnSide;
  /** Left column width %. 20-80. Default 50. */
  left_width_pct?: number;
  /** Stack columns vertically below this viewport width. Default true (stacks at <768px). */
  mobile_stack?: boolean;
  vertical_align?: "top" | "center" | "bottom";
  bg_color?: string;
  text_color?: string;
  padding_y_px?: number;
  /** Gap between columns in px. Default 48. */
  gap_px?: number;
  /** Container max width in px. Default 1200. */
  container_width_px?: number;
};

/**
 * One column of the three_column block. Self-contained — heading,
 * image, body HTML, optional CTA — with full typography control on
 * heading + body. Unlike TwoColumnContent (which wraps OTHER block
 * types per side), three_column owns its column data directly.
 */
export type ThreeColumnSide = {
  /** Per-column link URL — both the image and the heading become
   *  clickable links to this URL. The CTA's href falls back to this
   *  when its own cta_href is empty, so editors can author one URL
   *  and have everything in the column point to it. */
  url?: string;
  heading?: string;
  heading_font?: "body" | "heading";
  heading_size_px?: number;
  heading_color?: string;
  heading_bold?: boolean;
  heading_italic?: boolean;
  /** Image renders ABOVE the heading. Picker is in the editor. */
  image_url?: string;
  image_alt?: string;
  /** Body HTML — rich text. Inline styles in the HTML preserved. */
  body_html?: string;
  body_font?: "body" | "heading";
  body_size_px?: number;
  body_color?: string;
  /** Per-column CTA. Lives under the column so each can differ. */
  cta?: BlockCta;
};

/**
 * Three-column section. Full-bleed background (color + optional image),
 * a section-level heading, then a 7-track CSS grid:
 *
 *   leftGutter | leftCol | leftSpace | middleCol | rightSpace | rightCol | rightGutter
 *
 * All seven widths are entered as percentages but normalise via fr
 * units — if the editor's percentages don't sum to 100, the grid
 * scales them proportionally (no breakage).
 */
export type ThreeColumnContent = {
  // Section-level
  heading?: string;
  heading_font?: "body" | "heading";
  heading_size_px?: number;
  heading_color?: string;
  heading_bold?: boolean;
  heading_italic?: boolean;
  heading_align?: "left" | "center" | "right";

  bg_color?: string;
  bg_image_url?: string;
  bg_image_fit?: "cover" | "contain" | "tile";
  bg_image_scale_pct?: number;
  text_color?: string;
  padding_y_px?: number;

  /** Corner radius applied to every column's image (one shared setting,
   *  not per column). 0 = squared, default 8 px. */
  image_corner_radius_px?: number;

  // 7-track widths in % (or any number — fr units distribute).
  // These are the DESKTOP (≥1024px) widths.
  left_gutter_pct?: number;
  left_col_pct?: number;
  left_space_pct?: number;
  middle_col_pct?: number;
  right_space_pct?: number;
  right_col_pct?: number;
  right_gutter_pct?: number;

  // TABLET (768–1023px) widths. Each falls back to the matching desktop
  // value when unset, so a block that never sets tablet widths renders
  // identically to before. Phones (<768px) always stack to one column.
  left_gutter_pct_tablet?: number;
  left_col_pct_tablet?: number;
  left_space_pct_tablet?: number;
  middle_col_pct_tablet?: number;
  right_space_pct_tablet?: number;
  right_col_pct_tablet?: number;
  right_gutter_pct_tablet?: number;

  vertical_align?: "top" | "center" | "bottom";
  /** @deprecated Phones now always stack to one column. */
  mobile_stack?: boolean;

  // The three column payloads
  left?: ThreeColumnSide;
  middle?: ThreeColumnSide;
  right?: ThreeColumnSide;
};

/**
 * Details + Rates (Dynamic). Two-column section: rich text on the left
 * (typically the standard "Retreat Details" boilerplate), pricing on the
 * right pulled live from AnamayOS so the rate sheet stays in sync with
 * the database. Falls back to a manually-entered tier list when AO is
 * unreachable, returns no tiers, or no `retreat_id` is set — the block
 * always renders something even if the data layer is dark.
 *
 * Optional CTA renders below the columns (e.g. "Book this retreat"),
 * matching the BlockCta pattern used by all other branded blocks.
 *
 * "Source of truth" is the AO retreat — the website never owns retreat
 * pricing. To keep the editor sane the AO retreat is identified by its
 * UUID; legacy WP slugs are not supported as a lookup key.
 */
export type DetailsRatesDynamicContent = LayoutWidthsContent & BlockCta & SectionFrame & {
  bg_color?: string;
  text_color?: string;
  padding_y_px?: number;
  /** Container max width in px. Default 1200. */
  container_width_px?: number;
  /** Gap between columns in px. Default 48. */
  gap_px?: number;
  /** Left column width %, 20-80. Default 55. */
  left_width_pct?: number;
  vertical_align?: "top" | "center" | "bottom";

  // ── Left column ────────────────────────────────────────────────────
  heading_left?: string;
  html_left?: string;

  // ── Right column ───────────────────────────────────────────────────
  heading_right?: string;
  /**
   * AnamayOS retreat UUID. When set, the block fetches active pricing
   * tiers from AO and renders them. When omitted (or AO is unreachable
   * or has no active tiers) the block falls back to `manual_tiers`.
   */
  retreat_id?: string;
  /**
   * Manual override / fallback tiers. Used when:
   *  - retreat_id is empty
   *  - the AO query fails or env vars aren't set
   *  - AO returns zero active tiers for the retreat
   * Editors can pre-populate these so the block is never empty.
   */
  manual_tiers?: PricingTier[];
  /** Footnote text below the tier list (e.g. "All prices in USD, excl. taxes."). */
  pricing_note?: string;
};

/**
 * Overlay mixin — applied per-instance to any block type whose
 * `block_types.is_overlay = true`. Lives in blocks.content JSONB so
 * one template can carry two variants of the same overlay type with
 * different anchors / triggers.
 *
 * - overlay_z       — stacking order (the bigger the value, the higher).
 *                     Top bar defaults to 40; side menu drawer to 50.
 * - overlay_anchor  — viewport edge the overlay is pinned to. "fullscreen"
 *                     stretches edge-to-edge (e.g. modal or curtain).
 * - overlay_trigger — when the overlay is visible:
 *                     - "always":    always rendered (top bars, agent bubble)
 *                     - "on-menu":   visible after the user opens the side menu
 *                     - "on-scroll": visible after the page scrolls past a threshold
 */
export type OverlayAnchor = "top" | "right" | "bottom" | "left" | "fullscreen";
export type OverlayTrigger = "always" | "on-menu" | "on-scroll";
export type OverlayMixin = {
  overlay_z?: number;
  overlay_anchor?: OverlayAnchor;
  overlay_trigger?: OverlayTrigger;
};

/**
 * Top-bar UI overlay. Replaces the hard-coded Header.tsx — same
 * structural fields (logo, CTA, menu button) so the rendered output
 * is identical to the legacy hard-coded version.
 */
export type UiTopContent = OverlayMixin & {
  logo_dark_url?: string;       // logo for normal (light bg) mode
  logo_light_url?: string;      // logo for over-video (dark bg) mode
  logo_width?: number;
  logo_height?: number;
  cta_label?: string;
  cta_href?: string;
  menu_label?: string;
  /** When true, the bar uses transparent dark styling while the page is
   *  scrolled to the top of a hero video and the page declares overVideo. */
  lightmode_when_over_video?: boolean;
};

/** A single nav row inside a side menu. Recursive children let one item
 *  expand into a sub-list (e.g. "Yoga Retreats" → [Rates, Types, FAQs]). */
export type UiNavItem = {
  label: string;
  href?: string;
  children?: UiNavItem[];
};

/**
 * Right-anchored slide-out menu. Replaces SideMenu.tsx. Items live in
 * the block content so they're editable via the block editor; for
 * backwards compatibility, when `items` is empty the renderer falls
 * back to the legacy SIDE_MENU constant in `data/nav.ts`.
 *
 * Two typography scopes:
 *   - "headline" → top-level rows (standalone links + group buttons)
 *   - "content"  → indented sub-items inside expanded groups
 *
 * Background is a brand token key (or hex) plus 0–100 opacity; the
 * underlying drawer keeps its backdrop-blur for the frosted look.
 *
 * Decorative graphics render at the top (above the auth block) and
 * bottom (below the CTA) of the drawer to break up the link list.
 */
export type UiSideMenuRightContent = OverlayMixin & {
  width_max_px?: number;        // drawer width cap (default 384)
  cta_label?: string;
  cta_href?: string;
  items?: UiNavItem[];

  // Drawer header
  title_text?: string;          // text shown at top of drawer (default "Menu")

  // Background
  bg_color?: string;            // brand token key or hex; '' = default charcoal
  bg_opacity?: number;          // 0–100; default 90

  // Headline typography (drawer title + top-level rows)
  headline_font?: "body" | "heading";
  headline_size_px?: number;
  headline_color?: string;
  headline_bold?: boolean;
  headline_italic?: boolean;

  // Content typography (sub-items inside groups)
  content_font?: "body" | "heading";
  content_size_px?: number;
  content_color?: string;
  content_bold?: boolean;
  content_italic?: boolean;

  // Decorative graphics
  decoration_top_url?: string;
  decoration_top_alt?: string;
  decoration_top_height_px?: number;     // default 80
  decoration_bottom_url?: string;
  decoration_bottom_alt?: string;
  decoration_bottom_height_px?: number;  // default 80
};

/**
 * Featured Retreats — auto-populated grid of retreats marked
 * `is_featured = true` in AnamayaOS. Each card links to that retreat's
 * page on the website (URL pattern `url_pattern` with `{slug}` token
 * replaced by AO's `website_slug`). The block has no per-instance
 * retreat data — the retreats list IS the AO data; the editor only
 * controls headings, the CTA label, and styling.
 */
export type FeaturedRetreatsContent = LayoutWidthsContent & {
  heading?: string;             // section heading; default "Featured Retreats"
  subheading?: string;          // optional sub-text under the heading
  max_count?: number;           // number of cards to show; default 6. Featured always show (even if more); empty slots backfill with soonest upcoming non-featured.
  register_label?: string;      // CTA button label; default "Register Now"
  /** Pattern for the per-retreat URL. `{slug}` is replaced with AO's
   *  website_slug; if a retreat has no website_slug the registration_link
   *  (or external_link) is used instead. Default `/retreats/{slug}/`. */
  url_pattern?: string;
  bg_color?: string;
  text_color?: string;
  heading_color?: string;
  card_bg_color?: string;        // each card's background; '' = white at 40 % (matches other site cards)
  card_border_color?: string;    // each card's border colour; '' = anamaya-mint (matches other site cards)
  card_border_width_px?: number; // 0 disables the border entirely; default 1
  card_corner_radius_px?: number;// rounded-corner radius in px; default 8 (= Tailwind rounded-lg)
  padding_y_px?: number;        // section vertical padding; default 64
  container_width_px?: number;  // max-width of inner content; default 1200
};

/**
 * Retreats Calendar — the public, on-brand replacement for the Retreat
 * Guru rg-calendar embed (lives at /book-retreat). Lists every UPCOMING
 * retreat from AnamayaOS (is_public + is_active + status='confirmed' +
 * future start_date), optionally grouped by month. Each row's Book
 * button links out to Retreat Guru — booking always stays external.
 * No per-instance retreat data; the list IS the AO data.
 */
export type RetreatsCalendarContent = LayoutWidthsContent & {
  heading?: string;             // section heading; default "Upcoming Retreats"
  subheading?: string;          // optional sub-text under the heading
  book_label?: string;          // Book button label; default "Book Now"
  /** Per-retreat page URL; `{slug}` → AO website_slug. When a retreat has
   *  no website_slug the name/image link falls back to its booking link.
   *  Default `/retreats/{slug}/`. */
  url_pattern?: string;
  max_count?: number;           // hard cap on rows; default 100
  group_by_month?: boolean;     // month headers; default true
  bg_color?: string;
  text_color?: string;
  heading_color?: string;
  card_bg_color?: string;
  card_border_color?: string;
  card_border_width_px?: number;
  card_corner_radius_px?: number;
  padding_y_px?: number;        // section vertical padding; default 64
  container_width_px?: number;  // max-width of inner content; default 1100
};

/**
 * Service Menu — AnamayaOS-driven, categorized service/price menu read
 * LIVE from the `service_catalog` table, parameterized by `domain`
 * (e.g. "spa"). The same block later powers cookbook / excursions /
 * biohacking by pointing it at a different domain. Reproduces the
 * "Centered Ceremony" design from the /spa-massage-costa-rica page:
 * per-category ornate divider (alternating red/green), a category title
 * bookended by the sideways flower, then treatment rows (name +
 * description left, right-aligned tiered prices).
 *
 * The block holds DISPLAY settings only — never prices. Which services
 * show, their categories, names, durations and prices all come from AO
 * (service_catalog.domain = domain, is_active = true), grouped by the
 * shared `spa_categories` table for labels + ordering. To change the
 * menu, an admin edits AnamayaOS — there is no per-instance service data.
 *
 * Degrades silently to a small empty state when AO env vars are missing
 * or the query fails (mirrors RetreatsCalendarBlock).
 */
export type ServiceMenuContent = LayoutWidthsContent & {
  /** AnamayaOS service_catalog domain to read. Default "spa". */
  domain?: string;
  /** Optional overall section heading above the menu. Default "". */
  heading?: string;
  /** Show the ornate red/green divider above each category. Default true. */
  show_dividers?: boolean;
  /** Bookend each category title with the sideways flower. Default true. */
  show_flower_titles?: boolean;
  /** Optional "Book" pill under the menu — only shown when both the label
   *  and the href are set. Off by default. */
  book_label?: string;
  book_href?: string;
  bg_color?: string;           // brand token or hex; auto = transparent
  text_color?: string;         // brand token or hex; auto = charcoal
  heading_color?: string;      // brand token or hex; auto = olive-dark
  price_color?: string;        // brand token or hex; auto = olive-dark
  container_width_px?: number; // max-width of the centered menu; default 820
  padding_y_px?: number;       // section vertical padding; default 64
};

/** One manual service card for ServiceCardsContent.items. Every field is
 *  optional; a blank `image_url` renders NO image (text goes full width). */
export type ServiceCardItem = {
  name?: string;          // service name (card title)
  price?: string;         // free-form price text, e.g. "$25 + tax" (blank → "Enquire")
  blurb?: string;         // one-line summary shown above "More info"
  description?: string;   // longer text revealed by the "More info" accordion
  image_url?: string;     // right-side 3:2 image; blank = no image column
  route?: string;         // optional "Route" meta row inside the accordion
  duration?: string;      // optional "Time" meta row inside the accordion
  link_label?: string;    // optional accordion link label
  link_href?: string;     // optional accordion link href
};

/**
 * Service Cards — an "advanced" service list. Each service is a CARD with a
 * name, price, one-line blurb, a native <details> "More info" accordion
 * (longer description + optional route/time rows + a link), and a RIGHT-SIDE
 * 3:2 image. Cards WITHOUT an image render full-width text (never an empty
 * box). Dual-mode: when `domain` is set it reads live from AnamayaOS
 * (service_catalog by domain), otherwise it renders the manual `items` list
 * stored on the block. Mirrors ServiceMenuBlock (AO by domain) +
 * DetailsRatesDynamicBlock (AO OR manual fallback).
 */
export type ServiceCardsContent = LayoutWidthsContent & {
  /** When set, read AnamayaOS service_catalog by this domain (live mode).
   *  Blank = manual mode using `items`. */
  domain?: string;
  /** Optional overall section heading above the cards. Default "". */
  heading?: string;
  /** Show the ornate red divider + flower bookends under the heading. */
  show_divider?: boolean;
  /** Manual service cards (fallback / used when `domain` is blank). */
  items?: ServiceCardItem[];
  bg_color?: string;           // brand token or hex; auto = transparent
  text_color?: string;         // brand token or hex; auto = charcoal
  heading_color?: string;      // brand token or hex; auto = olive-dark
  container_width_px?: number; // max-width of the card column; default 760
  padding_y_px?: number;       // section vertical padding; default 64
};

/**
 * Featured by Search — AI-recommended retreats. Same card design as
 * FeaturedRetreatsContent, but instead of the is_featured flag it ranks
 * upcoming retreats by semantic relevance to a context.
 */
/**
 * FAQ block. The block instance only holds display settings — the actual
 * questions/answers are per-page and live in the `page_faqs` table (keyed
 * to the page the block renders on), so one block on a template produces a
 * different FAQ list on every page/post.
 */
export type FaqContent = LayoutWidthsContent & {
  heading?: string;             // section heading; default "Frequently Asked Questions"
  subheading?: string;          // optional sub-text under the heading
  /** Label for the collapsible panel holding the non-featured FAQs.
   *  Default "More questions". */
  more_label?: string;
  bg_color?: string;
  text_color?: string;
  heading_color?: string;
  padding_y_px?: number;
  /** Section content width: a % of the section width, or an absolute px
   *  value. Content is centered within it. */
  width_value?: number;
  width_unit?: CardSizeUnit;
  /** Decorative frame image shown at the TOP of the section and mirrored
   *  (flipped vertically) at the BOTTOM. Empty = no frame. */
  frame_image_url?: string;
  /** Frame size: a % of the section width, or an absolute px value. */
  frame_scale_value?: number;
  frame_scale_unit?: CardSizeUnit;
};

export type FeaturedBySearchContent = LayoutWidthsContent & {
  heading?: string;             // section heading; default "Recommended Retreats"
  subheading?: string;          // optional sub-text under the heading
  max_count?: number;           // number of retreats to recommend; default 4
  /** true (default) = use the current page/post's content as the context;
   *  false = use the `search_terms` phrase the builder typed. */
  use_page_context?: boolean;
  search_terms?: string;        // the phrase to match when use_page_context = false
  register_label?: string;      // CTA button label; default "Register Now"
  url_pattern?: string;         // per-retreat URL; `{slug}` → AO website_slug; default "/retreats/{slug}/"
  bg_color?: string;
  text_color?: string;
  heading_color?: string;
  card_bg_color?: string;
  card_border_color?: string;
  card_border_width_px?: number;
  card_corner_radius_px?: number;
  padding_y_px?: number;
  container_width_px?: number;
};

/** A single label+href pair used by both link and social groups. */
export type FooterLinkItem = { label: string; href: string };

/** Vertically-stacked groups can appear inside a single footer column. */
export type FooterLinkGroup = {
  kind: "links";
  heading: string;
  items: FooterLinkItem[];
};
export type FooterSocialGroup = {
  kind: "social";
  heading: string;
  links: FooterLinkItem[];
};
export type FooterNewsletterGroup = {
  kind: "newsletter";
  heading: string;
  form_id: string;          // Sereenly form id
  form_name?: string;       // analytics label
  form_height?: number;     // initial iframe height (px)
};
export type FooterColumnGroup = FooterLinkGroup | FooterSocialGroup | FooterNewsletterGroup;

/** A footer column holds one or more groups stacked vertically.
 *  Matches the legacy layout where (e.g.) "Travel" and "Cookbook" share
 *  one visual column. */
export type FooterColumn = {
  groups: FooterColumnGroup[];
};

/**
 * Main site footer — dark, multi-column block with link groups, social
 * icons, and an embedded newsletter form. Lives in the `site_footer`
 * page_template so edits propagate to every public page. NOT an overlay
 * — it sits in normal document flow at the bottom of the page.
 *
 * Layout is one CSS grid row of N columns (mobile stacks). Inside each
 * column, groups render top-to-bottom in the order saved.
 */
export type UiFooterMainContent = {
  bg_color?: string;             // brand token or hex; default '#444444'
  bg_opacity?: number;           // 0–100; default 100
  heading_color?: string;        // default '#8F993E' (anamaya-olive)
  link_color?: string;           // default '#b8d3cf' (anamaya-mint)
  text_color?: string;           // body text color
  columns?: FooterColumn[];
};

/**
 * Light "legal" footer strip — copyright + Terms / Privacy / credit.
 * Renders below the main footer. Body is editable rich-text HTML; the
 * literal "{year}" token is replaced with the current year at render
 * time so editors don't have to bump the date manually.
 */
export type UiFooterLegalContent = {
  bg_color?: string;             // default '#fbfbfb' (cream)
  text_color?: string;           // default '#444444'
  body_html?: string;            // rich-text; supports {year} token
  align?: "left" | "center" | "right";
  padding_y_px?: number;
  font_size_px?: number;
};

/**
 * AI assistant bubble. Wraps the existing VisitorAgent component —
 * runtime visibility still gates on /api/ai/agent-config (per-tenant
 * enable/disable), the block content only controls placement and
 * retrieval scope.
 */
export type UiAgentContent = OverlayMixin & {
  /** When set, /api/ai/ask retrieval is scoped to this sub-property
   *  (UUID of an AnamayOS property). Leave null for the default
   *  whole-site agent. */
  property_id_scope?: string | null;
};

/**
 * Reactions block. A self-contained affection widget for the bottom of an
 * article/post template: a hollow terracotta heart that opens a LIKE / LOVE /
 * MARRY modal; the reacted state shows LIKED / LOVED / TRULY LOVED with a
 * small/medium/large heart. One vote per device. Records against the current
 * page path (read at runtime) via /api/reactions, and pings /api/views.
 * Holds display settings only — the counts live in article_engagement.
 */
export type ReactionsContent = {
  heading?: string; // small prompt shown above the heart
  modal_question?: string; // the question at the top of the modal
  align?: "left" | "center" | "right";
  padding_y_px?: number;
};

/**
 * Booking Calendar block — an interactive Saturday-to-Saturday retreats
 * calendar fed live from AnamayOS. Content is just gating; the calendar's
 * look is fixed. One block powers many filtered calendars.
 */
export type BookingCalendarContent = {
  /** Which retreats to show: everything, YTTs only, or weekly retreats only. */
  retreat_type?: "all" | "ytt" | "retreat";
  /** Hide sold-out retreats (show only bookable ones). */
  only_available?: boolean;
};

/**
 * Info Card — the first VERTICAL block (shape='vertical'), built for the side
 * column of a two-column template. A compact card: heading, a highlighted
 * value (e.g. a price), quick-fact rows, and a CTA. Every vertical block also
 * carries `responsive_mode` (see below), read by the two-column renderer.
 */
export type InfoCardContent = {
  /** Vertical-block responsive behavior. "fixed" = always visible (stacks
   *  inline on narrow screens); "hidden" = collapses into a left-edge
   *  slide-out tab on narrow screens. */
  responsive_mode?: "fixed" | "hidden";
  heading?: string;
  subheading?: string;
  highlight_label?: string; // e.g. "From"
  highlight_value?: string; // e.g. "$895"
  rows?: { label: string; value: string }[];
  cta_label?: string;
  cta_href?: string;
  bg_color?: string;
  text_color?: string;
};

/**
 * Retreat Leader — VERTICAL block for a retreat template's side column.
 * One instance per teacher (co-taught retreats stack two of these in the
 * aside). Prefers live AnamayOS data when `ao_person_id` is set and the
 * lookup succeeds; otherwise renders the manual fields, which the retreat
 * conversion pipeline pre-fills from the bio scraped off the legacy page.
 * Never blank — same "AO live OR manual fallback" pattern as
 * DetailsRatesDynamicBlock / ServiceCardsBlock.
 */
export type RetreatLeaderContent = {
  responsive_mode?: "fixed" | "hidden";
  /** AnamayOS persons.id (uuid). When set + resolvable, live name/photo/bio
   *  from persons + retreat_leader_profiles are used instead of the manual
   *  fields below. */
  ao_person_id?: string;
  role?: string; // "Lead Teacher" | "Co-Teacher" | "Guest Teacher" | free text
  name?: string;
  photo_url?: string;
  bio_html?: string;
  link_label?: string;
  link_href?: string;
  bg_color?: string;
  text_color?: string;
};

/** One room/rate line for RetreatRatesContent's manual fallback tier list. */
export type RetreatRateTier = {
  name: string; // e.g. "Dorm", "Double"
  price: string; // pre-formatted, e.g. "$1,595"
  note?: string;
};

/**
 * Retreat Overview & Rates — HORIZONTAL block for a retreat template's main
 * column (typically placed right under the hero). Dates, starting price,
 * a per-room-type price breakdown, a spots-left note, and the Book/Enquire
 * button — pulled live from the AnamayOS retreat record (`retreats` table:
 * start_date/end_date/pricing_options/available_spaces/is_sold_out/
 * registration_link) when `retreat_id` is set and reachable. Falls back to
 * the manual fields (pre-filled from the legacy page's scraped pricing at
 * conversion time) otherwise — never renders empty.
 */
export type RetreatRatesContent = {
  /** AnamayOS retreats.id (uuid). Live source when set. */
  retreat_id?: string;
  heading?: string; // default "Dates & Rates"
  manual_dates_text?: string;
  manual_tiers?: RetreatRateTier[];
  manual_spots_text?: string;
  manual_cta_label?: string;
  manual_cta_href?: string;
  bg_color?: string;
  text_color?: string;
  container_width_px?: number;
  padding_y_px?: number;
};

/**
 * Teacher Profile — the yoga-teacher template's main block. One shared
 * block + template (`single-yoga_teacher`) is reused across every teacher
 * page; each page's actual name/photo/bio is a per-page override
 * (page_block_overrides), the same mechanism blog posts already use to
 * share one template. Prefers live AnamayOS data when `ao_person_id` is
 * set and resolvable (persons + retreat_leader_profiles); otherwise the
 * manual fields. Once teachers self-register in AnamayOS, existing pages
 * just need their override's ao_person_id filled in to go live.
 */
export type TeacherProfileContent = {
  ao_person_id?: string;
  name?: string;
  credentials?: string; // e.g. "RYT-500 · Embodied Rewilding™ founder"
  photo_url?: string;
  /** Wide hero photo behind the name. Falls back to photo_url when unset. */
  banner_url?: string;
  bio_html?: string;
  specialties?: string[];
  website_url?: string;
  instagram_handle?: string;
  bg_color?: string;
  text_color?: string;
};

export type BlockTypeSlug =
  | "rich_text"
  | "hero"
  | "cta_banner"
  | "press_bar"
  | "rich_bg"
  | "video_showcase"
  | "checklist"
  | "newsletter"
  | "image_overlay"
  | "image_text"
  | "divider"
  | "quote"
  | "date_range"
  | "pricing_table"
  | "feature_list"
  | "gallery"
  | "person_card"
  | "raw_html"
  | "two_column"
  | "three_column"
  | "details_rates_dynamic"
  | "ui_top"
  | "ui_side_menu_right"
  | "ui_agent"
  | "ui_footer_main"
  | "ui_footer_legal"
  | "featured_retreats"
  | "featured_by_search"
  | "retreats_calendar"
  | "service_menu"
  | "small_form_over_image"
  | "google_map_with_text"
  | "testimonials"
  | "image_slideshow"
  | "faq"
  | "reactions"
  | "booking_calendar"
  | "service_cards"
  | "info_card"
  | "room_grid"
  | "room_detail"
  | "retreat_leader"
  | "retreat_rates"
  | "teacher_profile";

export type BlockRecord = {
  id: string;
  type_slug: BlockTypeSlug;
  name: string;
  content: unknown;
};

/**
 * Testimonials carousel block. Pulls featured testimonials from one
 * testimonial category (testimonial_sets.slug) and rotates through
 * them with a crossfade. Server-renders all slides as semantic
 * `<figure><blockquote>` elements so crawlers + LLM agents can parse
 * every testimonial regardless of which is currently visible.
 */
export type TestimonialsBlockContent = LayoutWidthsContent & {
  /** Category slug (testimonial_sets.slug). Required for the block to
   *  render anything. */
  category_slug?: string;
  /** Number of seconds each slide stays fully visible before the fade
   *  starts. Defaults to 4. */
  display_seconds?: number;
  /** Crossfade duration between slides, in seconds. Defaults to 2. */
  fade_seconds?: number;
  /** Maximum slides to include from the category (after featured filter).
   *  Default: all featured rows. */
  max_count?: number;

  /** Section background colour. */
  bg_color?: string;
  /** Optional decorative image laid over the section background. */
  bg_image_url?: string;
  /** Background image opacity 0..100 (default 100). */
  bg_image_opacity?: number;
  /** CSS mix-blend-mode for the image layer. Default "normal". */
  bg_image_blend_mode?: string;

  /** Vertical padding in px. Default 80. */
  padding_y_px?: number;
  /** Max content width in px. Default 900. */
  content_width_px?: number;

  /** Heading text. Default "TESTIMONIALS". */
  heading?: string;
  /** Heading colour token (brand-token key). */
  heading_color?: string;
  /** Body text colour token. */
  text_color?: string;

  /** Section-heading font size in px. Default 37 (was 36). */
  heading_size_px?: number;
  /** Review-title font size in px. Default 25 (was 24). */
  title_size_px?: number;
  /** Quote-body font size in px. Default 19 (was 18). */
  body_size_px?: number;

  /** Show the TripAdvisor 5-star badge under each testimonial. Default true. */
  show_tripadvisor_badge?: boolean;
};

/**
 * A single slide in an Image Slideshow block. Carries the image plus
 * its complete text-overlay configuration so each slide can have its
 * own font, size, colour, alignment, position and letter-stroke
 * (border) settings — all editable in one panel per slide.
 */
export type ImageSlideshowSlide = {
  image_url: string;
  image_alt?: string;

  /** Optional text overlay shown on top of this slide's image. */
  text?: string;

  /** Font key — value matches an entry in lib/slideshow-fonts. */
  text_font?: string;
  text_size_px?: number;
  text_color?: string;        // brand-token key OR raw hex
  text_align?: "left" | "center" | "right";
  text_position?: "top" | "center" | "bottom";
  text_bold?: boolean;
  text_italic?: boolean;

  /** Stroke (border) painted around each letter to help text stand
   *  out against busy images. Width is in px (0..20). 0 disables it. */
  text_stroke_color?: string;
  text_stroke_width_px?: number;
};

/**
 * Full-width slideshow that crossfades between editor-uploaded images.
 * Per-slide content + per-slide text styling lives in
 * ImageSlideshowSlide. Block-level content here is just timing,
 * height, fit, overlay and a fallback background.
 */
export type ImageSlideshowContent = {
  slides?: ImageSlideshowSlide[];

  /** Seconds each slide stays fully visible before the fade starts. Default 4. */
  display_seconds?: number;
  /** Crossfade duration in seconds. Default 1.5. */
  fade_seconds?: number;

  /** Section height in viewport heights (vh). Default 80. */
  height_vh?: number;
  /** Object-fit for slide images. Default "cover". */
  image_fit?: "cover" | "contain";
  /** Dark overlay opacity 0..100 to improve text contrast. Default 0. */
  overlay_opacity?: number;

  /** Section background colour shown if a slide image fails to load. */
  bg_color?: string;
};

export type BlockUsage = {
  id: string;
  block: BlockRecord;
  /** Resolved content — the override if present, otherwise the master block's content. */
  content: unknown;
  page_key: string;
  sort_order: number;
};
