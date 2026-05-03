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
import TwoColumnBlock from "./TwoColumnBlock";
import ThreeColumnBlock from "./ThreeColumnBlock";
import DetailsRatesDynamicBlock from "./DetailsRatesDynamicBlock";
import UiTopBlock from "./UiTopBlock";
import UiSideMenuRightBlock from "./UiSideMenuRightBlock";
import UiAgentBlock from "./UiAgentBlock";
import UiFooterMainBlock from "./UiFooterMainBlock";
import UiFooterLegalBlock from "./UiFooterLegalBlock";
import FeaturedRetreatsBlock from "./FeaturedRetreatsBlock";
import SmallFormOverImageBlock from "./SmallFormOverImageBlock";

/**
 * Renders a block from its type slug and resolved content. The single
 * dispatch table used by:
 *   - TemplateRenderer (renders ordered blocks for a page)
 *   - admin LivePreview (renders a single block in the editor)
 *   - admin /block-preview iframe (isolated single-block render)
 *
 * Avoids the per-block DB roundtrip that Shortcode performs (which
 * looks up by slug). Pass content directly so callers can substitute
 * per-page override content without re-querying.
 */
export default function renderBlockByType(
  typeSlug: BlockTypeSlug | string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any,
): React.ReactNode {
  switch (typeSlug as BlockTypeSlug) {
    case "rich_text":             return <RichTextBlock content={content} />;
    case "hero":                  return <HeroBlock content={content} />;
    case "cta_banner":            return <CtaBannerBlock content={content} />;
    case "press_bar":             return <PressBarBlock content={content} />;
    case "rich_bg":               return <RichBgBlock content={content} />;
    case "video_showcase":        return <VideoShowcaseBlock content={content} />;
    case "checklist":             return <ChecklistBlock content={content} />;
    case "newsletter":            return <NewsletterBlock content={content} />;
    case "image_overlay":         return <ImageOverlayBlock content={content} />;
    case "image_text":            return <ImageTextBlock content={content} />;
    case "divider":               return <DividerBlock content={content} />;
    case "quote":                 return <QuoteBlock content={content} />;
    case "date_range":            return <DateRangeBlock content={content} />;
    case "pricing_table":         return <PricingTableBlock content={content} />;
    case "feature_list":          return <FeatureListBlock content={content} />;
    case "gallery":               return <GalleryBlock content={content} />;
    case "person_card":           return <PersonCardBlock content={content} />;
    case "raw_html":              return <RawHtmlBlock content={content} />;
    case "two_column":            return <TwoColumnBlock content={content} />;
    case "three_column":          return <ThreeColumnBlock content={content} />;
    case "details_rates_dynamic": return <DetailsRatesDynamicBlock content={content} />;
    case "ui_top":                return <UiTopBlock content={content} />;
    case "ui_side_menu_right":    return <UiSideMenuRightBlock content={content} />;
    case "ui_agent":              return <UiAgentBlock content={content} />;
    case "ui_footer_main":        return <UiFooterMainBlock content={content} />;
    case "ui_footer_legal":       return <UiFooterLegalBlock content={content} />;
    case "featured_retreats":     return <FeaturedRetreatsBlock content={content} />;
    case "small_form_over_image": return <SmallFormOverImageBlock content={content} />;
    default:                      return null;
  }
}
