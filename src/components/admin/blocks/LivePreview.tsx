"use client";

import { forwardRef, useEffect, useState } from "react";
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
import UiTopBlock from "@/components/blocks/UiTopBlock";
import UiSideMenuRightBlock from "@/components/blocks/UiSideMenuRightBlock";
import UiAgentBlock from "@/components/blocks/UiAgentBlock";
import UiFooterMainBlock from "@/components/blocks/UiFooterMainBlock";
import UiFooterLegalBlock from "@/components/blocks/UiFooterLegalBlock";
import ThreeColumnBlock from "@/components/blocks/ThreeColumnBlock";
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
  /**
   * When true, the preview canvas swaps to a checkerboard backdrop and
   * establishes its own containing block (via `transform`) so any
   * `position: fixed` markup inside the rendered block stays within the
   * preview frame instead of pinning to the page viewport. Use for
   * blocks whose block_type has is_overlay = true.
   */
  isOverlay?: boolean;
  /**
   * Block slug — used by async blocks (e.g. featured_retreats) that
   * can't render inline in this client tree. The preview renders an
   * iframe to /block-preview/{slug} so the server-rendered output is
   * visible, and the snapshot helper grabs it from the iframe.
   */
  blockSlug?: string;
};

/** Block types that have an async/server-only renderer and therefore
 *  preview via the /block-preview iframe instead of inline rendering. */
const IFRAME_PREVIEW_TYPES: ReadonlySet<string> = new Set(["featured_retreats"]);

// 15px checkerboard via two stacked linear-gradients. No image asset.
const OVERLAY_CANVAS_BG: React.CSSProperties = {
  backgroundColor: "#fff",
  backgroundImage:
    "linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%)," +
    "linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%)",
  backgroundSize: "30px 30px",
  backgroundPosition: "0 0, 15px 15px",
};

const LivePreview = forwardRef<HTMLDivElement, Props>(function LivePreview(
  {
    typeSlug,
    content,
    label = "Live preview (as it appears on the site)",
    currentId,
    typeName,
    variants,
    isOverlay,
    blockSlug,
  },
  ref,
) {
  const useIframe = IFRAME_PREVIEW_TYPES.has(typeSlug) && !!blockSlug;

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
          {useIframe ? (
            <IframePreview slug={blockSlug as string} />
          ) : isOverlay ? (
            // Overlay canvas: checkerboard backdrop + transformed wrapper
            // so the rendered block's `position: fixed` is contained
            // within this frame instead of pinning to the page viewport.
            // Minimum height ensures the canvas is visible even when the
            // overlay itself is anchored to a single edge (e.g. top bar
            // is only 80px tall).
            <div
              className="relative w-full"
              style={{
                ...OVERLAY_CANVAS_BG,
                minHeight: 360,
                transform: "translate3d(0,0,0)",
              }}
            >
              <BlockRender typeSlug={typeSlug} content={content} />
            </div>
          ) : (
            <BlockRender typeSlug={typeSlug} content={content} />
          )}
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

/** Iframe preview for async server-only block types. The iframe is
 *  remounted when the slug changes (key), and grows to match its
 *  document height via a postMessage from BlockPreviewMeasurer inside
 *  /block-preview. Caveat: shows the SAVED state, so unsaved draft
 *  edits aren't reflected until the user clicks Save and the iframe
 *  reloads. */
function IframePreview({ slug }: { slug: string }) {
  const [height, setHeight] = useState(800);
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data as { type?: string; height?: number } | null;
      if (!data || data.type !== "block-preview-height") return;
      if (typeof data.height === "number" && data.height > 0) {
        setHeight(Math.round(data.height));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return (
    <iframe
      key={slug}
      src={`/block-preview/${slug}`}
      title={`Preview of ${slug}`}
      className="block w-full border-0"
      style={{ height }}
    />
  );
}

export default LivePreview;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    case "ui_top":            return <UiTopBlock content={content} />;
    case "ui_side_menu_right": return <UiSideMenuRightBlock content={content} />;
    case "ui_agent":          return <UiAgentBlock content={content} />;
    case "ui_footer_main":    return <UiFooterMainBlock content={content} />;
    case "ui_footer_legal":   return <UiFooterLegalBlock content={content} />;
    case "three_column":      return <ThreeColumnBlock content={content} />;
    // FeaturedRetreatsBlock is async (fetches AO data). LivePreview is
    // a client component, so we render a placeholder here; the real
    // component renders fine in the public TemplateRenderer + admin
    // /block-preview iframe (both server-rendered).
    case "featured_retreats":
      return (
        <div className="flex h-32 items-center justify-center bg-anamaya-cream/60 text-xs italic text-anamaya-charcoal/60">
          Featured Retreats — preview at the page&rsquo;s public URL
        </div>
      );
    default:
      return (
        <div className="flex h-24 items-center justify-center bg-zinc-100 text-xs text-anamaya-charcoal/50">
          Preview not available for {typeSlug}
        </div>
      );
  }
}
