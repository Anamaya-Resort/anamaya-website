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
type Search = { variant?: string };

export default async function TemplatePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { id } = await params;
  const { variant } = await searchParams;

  const sb = supabaseServerOrNull();
  if (!sb) notFound();
  const { data: template } = await sb
    .from("page_templates")
    .select("id, slug, name")
    .eq("id", id)
    .maybeSingle();
  if (!template) notFound();

  return <TemplateRenderer templateId={template.id} variantSlug={variant} />;
}
