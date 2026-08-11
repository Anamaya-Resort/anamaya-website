import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import TemplateRenderer from "@/components/templates/TemplateRenderer";

export const dynamic = "force-dynamic";

/**
 * Public live-preview of a template. URL pattern:
 *   /preview/template/{templateId}
 *   /preview/template/{templateId}?variant={variantSlug}
 *
 * Renders inside the (site) layout, so the public site chrome (top
 * bar, side menu, agent overlays from the site_chrome template) wraps
 * the preview just like a real public page would. No auth — the URL
 * is shareable so an admin can send it to a friend or teammate for
 * feedback without giving them admin access.
 *
 * Excluded from search engines via meta robots.
 */
export const metadata: Metadata = {
  title: "Template preview — Anamaya",
  robots: { index: false, follow: false },
};

type Params = { id: string };
type Search = { variant?: string; page?: string; thumb?: string };

// Thumbnail mode (?thumb=1): cover heroes size themselves with `height: NNvh`,
// which balloons when this page is rendered inside a very tall thumbnail
// iframe (vh is relative to the iframe's height). Cap the cover hero to a
// fixed height so the WHOLE page renders at a normal scale for the miniature.
const THUMB_CSS = `[data-hero-cover="true"]{height:420px !important;min-height:0 !important;}`;

export default async function TemplatePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { id } = await params;
  const { variant, page, thumb } = await searchParams;
  const isThumb = thumb === "1";

  const sb = supabaseServerOrNull();
  if (!sb) notFound();
  const { data: template } = await sb
    .from("page_templates")
    .select("id, slug, name")
    .eq("id", id)
    .maybeSingle();
  if (!template) notFound();

  // When `page` is present (a draft url_inventory id, e.g. from the Add-New
  // wizard's preview step), pass it as pageId so TemplateRenderer swaps in
  // that draft's per-slot overrides on unlocked blocks. Absent → template
  // defaults, exactly as before.
  return (
    <>
      {isThumb && <style dangerouslySetInnerHTML={{ __html: THUMB_CSS }} />}
      <TemplateRenderer
        templateId={template.id}
        variantSlug={variant}
        pageId={page}
      />
    </>
  );
}
