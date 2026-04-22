"use client";

import { forwardRef } from "react";
import type { BlockTypeSlug } from "@/types/blocks";
import PressBarBlock from "@/components/blocks/PressBarBlock";
import RichTextBlock from "@/components/blocks/RichTextBlock";
import CtaBannerBlock from "@/components/blocks/CtaBannerBlock";

/**
 * Reusable live-preview shell for any block editor.
 * - Breaks out of the admin column to render at full viewport width.
 * - Exposes a ref to the preview node so the caller can html-to-image it.
 */
type Props = {
  typeSlug: BlockTypeSlug;
  content: unknown;
  /** Optional label shown at the top of the preview section. */
  label?: string;
};

const LivePreview = forwardRef<HTMLDivElement, Props>(function LivePreview(
  { typeSlug, content, label = "Live preview (as it appears on the site)" },
  ref,
) {
  return (
    <section className="mb-8">
      <header className="mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-anamaya-charcoal/60">
          {label}
        </h3>
      </header>
      <div
        ref={ref}
        style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }}
      >
        <BlockRender typeSlug={typeSlug} content={content} />
      </div>
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
