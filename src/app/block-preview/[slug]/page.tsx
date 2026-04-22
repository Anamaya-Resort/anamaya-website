// Rendered inside the template editor's wireframe iframes — one block
// at its natural viewport width, no site/admin chrome. Inherits only
// the root layout (HTML, brand tokens, fonts).
import Shortcode from "@/components/blocks/Shortcode";

export const dynamic = "force-dynamic";

export default async function BlockPreview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main>
      <Shortcode slug={slug} />
    </main>
  );
}
