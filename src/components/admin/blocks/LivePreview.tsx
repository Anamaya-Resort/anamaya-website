"use client";

import { forwardRef } from "react";
import type { BlockTypeSlug } from "@/types/blocks";
import PressBarBlock from "@/components/blocks/PressBarBlock";
import RichTextBlock from "@/components/blocks/RichTextBlock";
import CtaBannerBlock from "@/components/blocks/CtaBannerBlock";
import HeroBlock from "@/components/blocks/HeroBlock";
import RichBgBlock from "@/components/blocks/RichBgBlock";
import VideoShowcaseBlock from "@/components/blocks/VideoShowcaseBlock";
import ChecklistBlock from "@/components/blocks/ChecklistBlock";
import NewsletterBlock from "@/components/blocks/NewsletterBlock";
import ImageOverlayBlock from "@/components/blocks/ImageOverlayBlock";
import ImageTextBlock from "@/components/blocks/ImageTextBlock";
import DividerBlock from "@/components/blocks/DividerBlock";
import QuoteBlock from "@/components/blocks/QuoteBlock";
import DateRangeBlock from "@/components/blocks/DateRangeBlock";
import PricingTableBlock from "@/components/blocks/PricingTableBlock";
import FeatureListBlock from "@/components/blocks/FeatureListBlock";
import GalleryBlock from "@/components/blocks/GalleryBlock";
import PersonCardBlock from "@/components/blocks/PersonCardBlock";
import RawHtmlBlock from "@/components/blocks/RawHtmlBlock";
import VariantCarousel from "./VariantCarousel";

/**
 * Reusable live-preview shell for any block editor.
 *
 * - Renders the block at true viewport width by wrapping the preview in
 *   an outer div with `width: 100vw; marginLeft: calc(50% - 50vw)`. The
 *   inner (ref'd) node is NOT margined, so html-to-image captures clean
 *   content — if the ref sat on the margined node the snapshot would
 *   come out shifted to the left.
 * - Optionally renders a VariantCarousel directly underneath, keeping
 *   preview + variants as a single visual unit at the top of every
 *   block editor.
 */
type Variant = {
  id: string;
  name: string;
  slug: string;
  snapshot_url: string | null;
};

type Props = {
  typeSlug: BlockTypeSlug;
  content: unknown;
  label?: string;
  /** When set, a VariantCarousel is rendered directly below the preview. */
  currentId?: string;
  typeName?: string;
  variants?: Variant[];
};

const LivePreview = forwardRef<HTMLDivElement, Props>(function LivePreview(
  {
    typeSlug,
    content,
    label = "Live preview (as it appears on the site)",
    currentId,
    typeName,
    variants,
  },
  ref,
) {
  return (
    <section className="mb-8">
      <header className="mb-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-800">
          {label}
        </h3>
      </header>

      {/* Outer wrapper breaks out of the admin column (full-bleed).
          The ref goes on the inner node so html-to-image captures the
          rendered block without the negative-margin offset. */}
      <div style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }}>
        <div ref={ref}>
          <BlockRender typeSlug={typeSlug} content={content} />
        </div>
      </div>

      {currentId && variants && (
        <div className="mt-4">
          <VariantCarousel
            currentId={currentId}
            typeSlug={typeSlug}
            typeName={typeName ?? typeSlug}
            variants={variants}
          />
        </div>
      )}
    </section>
  );
});

export default LivePreview;

function BlockRender({ typeSlug, content }: { typeSlug: BlockTypeSlug; content: any }) {
  switch (typeSlug) {
    case "press_bar":      return <PressBarBlock content={content} />;
    case "rich_text":      return <RichTextBlock content={content} />;
    case "cta_banner":     return <CtaBannerBlock content={content} />;
    case "hero":           return <HeroBlock content={content} />;
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
    default:
      return (
        <div className="flex h-24 items-center justify-center bg-zinc-100 text-xs text-anamaya-charcoal/50">
          Preview not available for {typeSlug}
        </div>
      );
  }
}
