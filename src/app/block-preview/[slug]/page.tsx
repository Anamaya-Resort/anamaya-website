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
            html, body { height: 100%; margin: 0; padding: 0; }
            section[data-hero-cover="true"] { height: 100% !important; }
          `,
        }}
      />
      <main>
        <Shortcode slug={slug} />
      </main>
    </>
  );
}
