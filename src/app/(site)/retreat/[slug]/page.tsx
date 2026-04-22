import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRetreatBySlug } from "@/lib/retreats";
import ProseHtml from "@/components/ProseHtml";

export const dynamic = "force-dynamic";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRetreatBySlug(slug);
  if (!r) return { title: "Retreat not found — Anamaya" };

  const title = r.seo?.title ?? `${r.title} — Anamaya Retreats`;
  const description =
    r.seo?.description ??
    r.excerpt ??
    "Transformational yoga retreat at Anamaya Resort in Costa Rica.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: r.seo?.og_image ? [r.seo.og_image] : r.featured_image_url ? [r.featured_image_url] : undefined,
      type: "article",
    },
    alternates: r.seo?.canonical ? { canonical: r.seo.canonical } : undefined,
  };
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function RetreatPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const r = await getRetreatBySlug(slug);
  if (!r) notFound();

  return (
    <>
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[420px] w-full overflow-hidden bg-anamaya-charcoal">
        {r.featured_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.featured_image_url}
            alt={r.title}
            loading="eager"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-anamaya-green to-anamaya-teal-muted" />
        )}
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center text-white">
          {r.category && (
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/85">
              {r.category}
            </p>
          )}
          <h1 className="text-balance text-4xl font-semibold leading-tight drop-shadow sm:text-5xl">
            {r.title}
          </h1>
          {r.excerpt && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/90 drop-shadow">
              {r.excerpt}
            </p>
          )}
        </div>
      </section>

      {/* Meta row */}
      <section className="border-b border-anamaya-charcoal/10 bg-anamaya-cream px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 text-sm text-anamaya-charcoal/70">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {r.author && (
              <span>
                <span className="text-anamaya-charcoal/50">By</span>{" "}
                <span className="font-medium text-anamaya-charcoal">
                  {r.author.display_name}
                </span>
              </span>
            )}
            {fmtDate(r.date_modified) && (
              <span>
                <span className="text-anamaya-charcoal/50">Updated</span>{" "}
                {fmtDate(r.date_modified)}
              </span>
            )}
          </div>
          <Link
            href="/rg-calendar/"
            className="rounded-full bg-anamaya-green px-6 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
          >
            Register Now
          </Link>
        </div>
      </section>

      {/* Body */}
      <article className="bg-white px-6 py-16">
        <ProseHtml html={r.body_html} />
      </article>

      {/* Trailing CTA */}
      <section className="bg-anamaya-cream px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-semibold text-anamaya-charcoal sm:text-3xl">
            Ready to join?
          </h2>
          <p className="mt-4 text-anamaya-charcoal/80">
            Secure your spot with a deposit — visit the calendar to pick your dates.
          </p>
          <Link
            href="/rg-calendar/"
            className="mt-8 inline-block rounded-full bg-anamaya-green px-10 py-4 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark"
          >
            View Calendar
          </Link>
          <Link
            href="/retreats"
            className="mt-4 block text-sm text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
          >
            ← Back to all retreats
          </Link>
        </div>
      </section>
    </>
  );
}
