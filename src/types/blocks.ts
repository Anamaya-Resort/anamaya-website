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
  /**
   * How the image fills the section:
   *  - "cover"   (default): fill the section, crop edges to match aspect
   *  - "contain": show the whole image, letterbox/pillarbox to fit
   */
  image_fit?: "cover" | "contain";
  /** Mirror the image top-to-bottom. */
  image_flip_y?: boolean;
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
  image_url?: string;
  image_side?: "left" | "right";
  /** Image column width, 25-75. */
  image_width_pct?: number;
  html?: string;
  bg_color?: string;
  text_color?: string;
  padding_y_px?: number;
  vertical_align?: "top" | "center" | "bottom";
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
  | "image_text";

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
