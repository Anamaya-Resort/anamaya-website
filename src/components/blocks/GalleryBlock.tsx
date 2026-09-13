import type { GalleryContent } from "@/types/blocks";
import { getGalleryImages } from "@/lib/galleries";
import GalleryBlockView from "./GalleryBlockView";

/**
 * Image gallery — async server component.
 *
 * Two ways to fill it, and the code wins. With a `gallery_code` the
 * block renders whatever that AnamayaOS gallery holds right now, so an
 * editor curates once there and every page and template naming the
 * code follows; without one it renders the images pasted into the
 * block. Same arrangement as the room grid and the service menu: the
 * block carries display settings, never the content.
 *
 * Resolved on the server, so the photographs are in the HTML a crawler
 * receives rather than appearing after a client fetch.
 *
 * Degrades quietly. An unknown, unpublished or empty code yields no
 * images and the block renders nothing, which is the same outcome as
 * an empty gallery and never a broken page.
 */
export default async function GalleryBlock({
  content,
  preview,
}: {
  content: GalleryContent;
  preview?: boolean;
}) {
  const code = content?.gallery_code?.trim();
  const images = code ? await getGalleryImages(code) : undefined;
  return (
    <GalleryBlockView content={content} preview={preview} overrideImages={images} />
  );
}
