import { supabaseServerOrNull } from "@/lib/supabase-server";
import Shortcode from "@/components/blocks/Shortcode";

/**
 * Server component that renders a template's ordered blocks by looking
 * up a template variant and dispatching each block through <Shortcode>.
 * Block HTML (including schema.org JSON-LD where applicable) is part of
 * the SSR response, so everything is crawlable.
 *
 * Defaults to the variant flagged `is_default = true`. Pass variantSlug
 * to pin a specific one — useful for A/B assignments later.
 */
export default async function TemplateRenderer({
  templateSlug,
  variantSlug,
}: {
  templateSlug: string;
  variantSlug?: string;
}) {
  const sb = supabaseServerOrNull();
  if (!sb) return null;

  const { data: template } = await sb
    .from("templates")
    .select("id")
    .eq("slug", templateSlug)
    .maybeSingle();
  if (!template) {
    return (
      <div className="mx-auto my-6 max-w-xl rounded border border-dashed border-zinc-300 px-4 py-3 text-sm italic text-anamaya-charcoal/60">
        Template <code>{templateSlug}</code> not found.
      </div>
    );
  }

  const variantQuery = sb
    .from("template_variants")
    .select("id")
    .eq("template_id", template.id);
  const { data: variant } = await (variantSlug
    ? variantQuery.eq("slug", variantSlug).maybeSingle()
    : variantQuery.eq("is_default", true).maybeSingle());
  if (!variant) {
    return (
      <div className="mx-auto my-6 max-w-xl rounded border border-dashed border-zinc-300 px-4 py-3 text-sm italic text-anamaya-charcoal/60">
        No default variant for <code>{templateSlug}</code>.
      </div>
    );
  }

  const { data: blocks } = await sb
    .from("template_variant_blocks")
    .select("block_id, sort_order, block:blocks(slug)")
    .eq("template_variant_id", variant.id)
    .order("sort_order");

  return (
    <>
      {(blocks ?? []).map((row) => {
        const b = row.block as { slug?: string } | null;
        if (!b?.slug) return null;
        return <Shortcode key={row.block_id} slug={b.slug} />;
      })}
    </>
  );
}
