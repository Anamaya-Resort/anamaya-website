import { supabaseServerOrNull } from "@/lib/supabase-server";
import type { BlockTypeSlug } from "@/types/blocks";
import RichTextBlock from "./RichTextBlock";
import HeroBlock from "./HeroBlock";
import CtaBannerBlock from "./CtaBannerBlock";
import PressBarBlock from "./PressBarBlock";
import RichBgBlock from "./RichBgBlock";
import VideoShowcaseBlock from "./VideoShowcaseBlock";
import ChecklistBlock from "./ChecklistBlock";
import NewsletterBlock from "./NewsletterBlock";
import ImageOverlayBlock from "./ImageOverlayBlock";
import ImageTextBlock from "./ImageTextBlock";
import DividerBlock from "./DividerBlock";
import QuoteBlock from "./QuoteBlock";
import DateRangeBlock from "./DateRangeBlock";
import PricingTableBlock from "./PricingTableBlock";
import FeatureListBlock from "./FeatureListBlock";
import GalleryBlock from "./GalleryBlock";
import PersonCardBlock from "./PersonCardBlock";
import RawHtmlBlock from "./RawHtmlBlock";
import UiTopBlock from "./UiTopBlock";
import UiSideMenuRightBlock from "./UiSideMenuRightBlock";
import UiAgentBlock from "./UiAgentBlock";
import UiFooterMainBlock from "./UiFooterMainBlock";
import UiFooterLegalBlock from "./UiFooterLegalBlock";
import FeaturedRetreatsBlock from "./FeaturedRetreatsBlock";

/**
 * Server component that renders the block identified by `slug` (matched
 * against blocks.slug, e.g. "press_bar_1" or "hero_vid_1"). The block's
 * content is fetched at request time and the resulting HTML is part of
 * the SSR response — meaning text/logos/headings inside the block are
 * indexed by crawlers just like any other markup on the page.
 *
 * Usage:
 *   <Shortcode slug="hero_vid_1" />
 *   <Shortcode slug="press_bar_1" />
 */
export default async function Shortcode({ slug }: { slug: string }) {
  const sb = supabaseServerOrNull();
  if (!sb) return null;
  const { data } = await sb
    .from("blocks")
    .select("type_slug, content")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) {
    return (
      <div className="mx-auto my-4 max-w-xl rounded border border-dashed border-zinc-300 px-4 py-3 text-sm italic text-anamaya-charcoal/60">
        Block <code>[#{slug}]</code> not found.
      </div>
    );
  }
  // Cast once: each block validates its own content shape internally.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = data.content as any;
  switch (data.type_slug as BlockTypeSlug) {
    case "rich_text":      return <RichTextBlock content={content} />;
    case "hero":           return <HeroBlock content={content} />;
    case "cta_banner":     return <CtaBannerBlock content={content} />;
    case "press_bar":      return <PressBarBlock content={content} />;
    case "rich_bg":        return <RichBgBlock content={content} />;
    case "video_showcase": return <VideoShowcaseBlock content={content} />;
    case "checklist":      return <ChecklistBlock content={content} />;
    case "newsletter":     return <NewsletterBlock content={content} />;
    case "image_overlay":  return <ImageOverlayBlock content={content} />;
    case "image_text":     return <ImageTextBlock content={content} />;
    case "divider":        return <DividerBlock content={content} />;
    case "quote":          return <QuoteBlock content={content} />;
    case "date_range":     return <DateRangeBlock content={content} />;
    case "pricing_table":  return <PricingTableBlock content={content} />;
    case "feature_list":   return <FeatureListBlock content={content} />;
    case "gallery":        return <GalleryBlock content={content} />;
    case "person_card":    return <PersonCardBlock content={content} />;
    case "raw_html":       return <RawHtmlBlock content={content} />;
    case "ui_top":            return <UiTopBlock content={content} />;
    case "ui_side_menu_right": return <UiSideMenuRightBlock content={content} />;
    case "ui_agent":          return <UiAgentBlock content={content} />;
    case "ui_footer_main":    return <UiFooterMainBlock content={content} />;
    case "ui_footer_legal":   return <UiFooterLegalBlock content={content} />;
    case "featured_retreats": return <FeaturedRetreatsBlock content={content} />;
    default:               return null;
  }
}
