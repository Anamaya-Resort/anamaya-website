// Rendered inside the template editor's wireframe iframes — one block
// at its natural viewport width, no site/admin chrome. Inherits only
// the root layout (HTML, brand tokens, fonts).
//
// The embedded <style> below forces a hero's `height: 80vh` (which
// resolves against the iframe's own viewport and leaves empty space
// below) to instead fill the iframe exactly, so the preview has no
// white gap under the block.
import Shortcode from "@/components/blocks/Shortcode";

export const dynamic = "force-dynamic";

export default async function BlockPreview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body { margin: 0; padding: 0; overflow: hidden; }
            /* Subpixel rounding between the admin wrapper's aspect-ratio
               and a block's natural content height can cause iframes to
               show a 1-pixel scroll bar. Hide any scrolling inside the
               preview iframe — we never want scrollbars in the preview. */
            /* The hero's inline \`height: 80vh\` resolves against the
               iframe's viewport and leaves empty space below. Force it
               to fill the iframe exactly. 100vh (not 100%) so it works
               regardless of ancestor heights. */
            section[data-hero-cover="true"] { height: 100vh !important; }
          `,
        }}
      />
      <main>
        <Shortcode slug={slug} />
      </main>
    </>
  );
}
