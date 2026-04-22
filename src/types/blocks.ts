// Content schemas for each block type. Stored as jsonb in blocks.content
// (or block_usages.override_content for per-usage overrides).

export type RichTextContent = {
  html: string;
};

export type HeroContent = {
  title?: string;
  subtitle?: string;
  image_url?: string;
  video_youtube_id?: string;
  video_poster_url?: string;
  cta?: { label: string; href: string };
  /** 0-100 — darkening overlay on the image/video for text legibility. */
  overlay_opacity?: number;
  /** Section height in vh. Default 80. */
  height_vh?: number;
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

/** Named color presets for press-bar backgrounds. */
export type PressBarBgPreset = "teal-muted" | "mint" | "cream" | "white" | "charcoal" | "custom";

export type PressBarContent = {
  heading?: string;
  /** Explicit grid column widths (percent). Must sum to 100. Default: 9 logos × 10% with a 20% featured slot. */
  column_widths_pct?: number[];
  logos: PressBarLogo[];
  /** Background color preset. Default 'teal-muted'. Use 'custom' + bg_color_custom for any hex. */
  bg_color?: PressBarBgPreset;
  /** Raw CSS color used only when bg_color === 'custom'. */
  bg_color_custom?: string;
  /** Heading text color (any CSS color). Defaults to white on dark bg, charcoal on light. */
  heading_color?: string;
  /** Regular-logo max height in px (default 48). Featured logos get 2× this. */
  logo_height_px?: number;
};

export type BlockTypeSlug = "rich_text" | "hero" | "cta_banner" | "press_bar";

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
