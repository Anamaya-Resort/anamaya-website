"use client";

import { forwardRef } from "react";
import type { BlockTypeSlug } from "@/types/blocks";
import PressBarBlock from "@/components/blocks/PressBarBlock";
import RichTextBlock from "@/components/blocks/RichTextBlock";
import CtaBannerBlock from "@/components/blocks/CtaBannerBlock";
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
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-anamaya-charcoal/60">
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
    case "press_bar":
      return <PressBarBlock content={content} />;
    case "rich_text":
      return <RichTextBlock content={content} />;
    case "cta_banner":
      return <CtaBannerBlock content={content} />;
    default:
      return (
        <div className="flex h-24 items-center justify-center bg-zinc-100 text-xs text-anamaya-charcoal/50">
          Preview not available for {typeSlug}
        </div>
      );
  }
}
