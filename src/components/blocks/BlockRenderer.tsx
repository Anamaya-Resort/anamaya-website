import type { BlockUsage } from "@/types/blocks";
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

/** Renders a single block-usage by dispatching on type. Null if unknown. */
export default function BlockRenderer({ usage }: { usage: BlockUsage | null }) {
  if (!usage?.block) return null;
  // Cast once: each block validates its own content shape internally.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = usage.content as any;

  switch (usage.block.type_slug) {
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
    case "two_column":     return <TwoColumnBlock content={content} />;
    default: {
      console.warn(`[blocks] unknown block type: ${usage.block.type_slug}`);
      return null;
    }
  }
}

/** Server component: fetch and render a single block by type on a page. */
import { getBlockByType } from "@/lib/blocks";
import type { BlockTypeSlug } from "@/types/blocks";

export async function BlockByType({
  pageKey,
  typeSlug,
}: {
  pageKey: string;
  typeSlug: BlockTypeSlug;
}) {
  const usage = await getBlockByType(pageKey, typeSlug);
  return <BlockRenderer usage={usage} />;
}
