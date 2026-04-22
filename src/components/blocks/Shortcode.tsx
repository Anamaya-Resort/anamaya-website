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
  const content = data.content as unknown;
  switch (data.type_slug as BlockTypeSlug) {
    case "rich_text":      return <RichTextBlock content={content as any} />;
    case "hero":           return <HeroBlock content={content as any} />;
    case "cta_banner":     return <CtaBannerBlock content={content as any} />;
    case "press_bar":      return <PressBarBlock content={content as any} />;
    case "rich_bg":        return <RichBgBlock content={content as any} />;
    case "video_showcase": return <VideoShowcaseBlock content={content as any} />;
    case "checklist":      return <ChecklistBlock content={content as any} />;
    case "newsletter":     return <NewsletterBlock content={content as any} />;
    case "image_overlay":  return <ImageOverlayBlock content={content as any} />;
    case "image_text":     return <ImageTextBlock content={content as any} />;
    default:               return null;
  }
}
