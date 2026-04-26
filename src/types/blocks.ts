// Content schemas for each block type. Stored as jsonb in blocks.content
// (or block_usages.override_content for per-usage overrides).

export type RichTextContent = {
  html: string;
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
};

export type CtaBannerContent = {
  heading: string;
  subheading?: string;
  bg_image_url?: string;
  image_alt?: string;
  cta?: { label: string; href: string };
};

export type PressBarLogo = {
  name: string;
  src: string;
  width: number;
  height: number;
  href?: string | null;
  /** Featured logos take 2x width in the grid. */
  featured?: boolean;
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

/** Rich Text with Background — any HTML on a branded background. */
export type RichBgContent = BlockCta & {
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
export type VideoShowcaseContent = BlockCta & {
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
export type ChecklistContent = BlockCta & {
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
export type NewsletterContent = {
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

  // ── Text ────────────────────────────────────────────────────────────
  html?: string;
  text_color?: string;

  // ── Deprecated: replaced by container_height_px when that's set ─────
  padding_y_px?: number;
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
export type QuoteContent = BlockCta & {
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
export type DateRangeContent = {
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
export type PricingTableContent = BlockCta & {
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
  image_url?: string;
  image_alt?: string;
  href?: string;
};
export type FeatureListContent = BlockCta & {
  heading?: string;
  intro?: string;
  items: FeatureListItem[];
  layout?: "stack" | "grid" | "split";
  /** For "grid" layout: 2-4 columns (default 3). */
  columns?: 2 | 3 | 4;
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
export type GalleryContent = {
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
 * Person card — used for retreat-leader, teacher, guest-speaker bios.
 * Composes a photo + name + credentials line + rich-text body + link.
 * "side-by-side" puts the photo to the left of the text; "stacked"
 * centers the photo above the text.
 */
export type PersonCardContent = BlockCta & {
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
export type RawHtmlContent = {
  html: string;
  bg_color?: string;
  padding_y_px?: number;
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
  | "raw_html";

export type BlockRecord = {
  id: string;
  type_slug: BlockTypeSlug;
  name: string;
  content: unknown;
};

export type BlockUsage = {
  id: string;
  block: BlockRecord;
  /** Resolved content — the override if present, otherwise the master block's content. */
  content: unknown;
  page_key: string;
  sort_order: number;
};
