import type { Metadata } from "next";
import {
  notFound,
  permanentRedirect,
  redirect,
  RedirectType,
} from "next/navigation";
import ProseHtml from "@/components/ProseHtml";
import TemplateRenderer from "@/components/templates/TemplateRenderer";
import { resolveContentPath, bumpRedirectHit } from "@/lib/website-builder/resolver";
import { getAllSettings } from "@/lib/website-builder/settings";

export const dynamic = "force-dynamic";

type Params = { slug: string[] };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [resolution, settings] = await Promise.all([
    resolveContentPath(slug),
    getAllSettings(),
  ]);

  if (resolution.kind !== "content") {
    return { title: "Not found — Anamaya" };
  }
  const r = resolution.row;

  const title = r.meta_title?.trim() || r.title || "Anamaya";
  const description =
    r.meta_description?.trim() ||
    r.excerpt ||
    settings.default_meta.meta_description ||
    undefined;
  const ogImage = r.og_image_url || settings.default_meta.og_image_url || undefined;

  return {
    title,
    description,
    robots: r.noindex ? { index: false, follow: false } : undefined,
    alternates: r.canonical_url ? { canonical: r.canonical_url } : undefined,
    openGraph: {
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
      type: "article",
    },
  };
}

export default async function CatchAllPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const resolution = await resolveContentPath(slug);

  if (resolution.kind === "redirect") {
    // Fire-and-forget hit counter. Don't await — redirect() throws and we
    // don't want to block the response on a counter write.
    void bumpRedirectHit(resolution.redirectId);
    // Next.js exposes 307 (redirect) and 308 (permanentRedirect) only.
    // 301 → 308 and 302 → 307: same semantics for crawlers/browsers,
    // and the table preserves the admin-set status for audit.
    if (resolution.status === 301 || resolution.status === 308) {
      permanentRedirect(resolution.target);
    } else {
      redirect(resolution.target, RedirectType.replace);
    }
  }

  if (resolution.kind === "notFound") {
    notFound();
  }

  const r = resolution.row;

  // When the row has a CMS template assigned, render via the template
  // pipeline (with per-page overrides). The HTML body fallback only
  // kicks in when no template is set — for migrated WP pages that
  // haven't yet been converted to the new framework.
  if (r.cms_template_id) {
    return (
      <TemplateRenderer
        templateId={r.cms_template_id}
        pageId={r.id}
      />
    );
  }

  return (
    <article className="bg-white">
      <header className="border-b border-anamaya-charcoal/10 bg-anamaya-cream px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-4xl font-semibold leading-tight text-anamaya-charcoal sm:text-5xl">
            {r.title}
          </h1>
          {r.excerpt && (
            <p className="mt-6 text-lg leading-relaxed text-anamaya-charcoal/80">
              {r.excerpt}
            </p>
          )}
        </div>
      </header>

      <div className="px-6 py-16">
        {r.body_html ? (
          <ProseHtml html={r.body_html} />
        ) : (
          <p className="mx-auto max-w-3xl text-anamaya-charcoal/70">
            This page has no content yet.
          </p>
        )}
      </div>
    </article>
  );
}
