// Rendered inside the template editor's wireframe iframes — one block
// at its natural viewport width, no site/admin chrome. Inherits only
// the root layout (HTML, brand tokens, fonts).
//
// The embedded <style> below forces a hero's `height: 80vh` (which
// resolves against the iframe's own viewport and leaves empty space
// below) to instead fill the iframe exactly, so the preview has no
// white gap under the block.
import Shortcode from "@/components/blocks/Shortcode";
import BlockPreviewMeasurer from "@/components/admin/blocks/BlockPreviewMeasurer";

export const dynamic = "force-dynamic";

export default async function BlockPreview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <>
      <BlockPreviewMeasurer />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Reset margins / padding / scrollbars. CRITICAL:
               override the root layout's "h-full" on <html> and
               "min-h-full" on <body> — those propagate into this
               iframe and force body to be at least the iframe's
               viewport height, so the parent's measurer reads back
               the iframe's own height (instead of the block's true
               content height) whenever the content is shorter than
               the initial estimate. With this override, body
               collapses to its children's height and the measurer
               can report a number smaller than the iframe. */
            html, body {
              margin: 0;
              padding: 0;
              overflow: hidden;
              height: auto !important;
              min-height: 0 !important;
            }
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
