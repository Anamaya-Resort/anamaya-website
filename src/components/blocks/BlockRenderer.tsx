import type { BlockUsage } from "@/types/blocks";
import RichTextBlock from "./RichTextBlock";
import HeroBlock from "./HeroBlock";
import CtaBannerBlock from "./CtaBannerBlock";
import PressBarBlock from "./PressBarBlock";

/** Renders a single block-usage by dispatching on type. Null if unknown. */
export default function BlockRenderer({ usage }: { usage: BlockUsage | null }) {
  if (!usage?.block) return null;
  const content = usage.content as any;

  switch (usage.block.type_slug) {
    case "rich_text":  return <RichTextBlock content={content} />;
    case "hero":       return <HeroBlock content={content} />;
    case "cta_banner": return <CtaBannerBlock content={content} />;
    case "press_bar":  return <PressBarBlock content={content} />;
    default: {
      // eslint-disable-next-line no-console
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
