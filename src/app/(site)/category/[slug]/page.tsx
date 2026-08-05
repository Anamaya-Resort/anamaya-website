import type { Metadata } from "next";
import { notFound } from "next/navigation";
import UiTopBlock from "@/components/blocks/UiTopBlock";
import UiSideMenuRightBlock from "@/components/blocks/UiSideMenuRightBlock";
import { getCategoryData, type CategoryPost } from "./data";
import { formatDate, liveArticleUrl } from "./helpers";

// Reads live from the staging DB per request.
export const dynamic = "force-dynamic";

type Params = { slug: string };

const GENERIC_LEDE =
  "Stories and guides from the teachers and guests of Anamaya, Costa Rica.";

/** Serialize JSON-LD, escaping characters that could break out of the
 *  surrounding <script> tag. Post titles are untrusted (scraped) content. */
function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryData(slug);
  if (!data) return { title: "Category not found — Anamaya" };
  const lede = data.term.description?.trim() || GENERIC_LEDE;
  return {
    title: `${data.term.name} — Anamaya`,
    description: lede,
    openGraph: {
      title: `${data.term.name} — Anamaya`,
      description: lede,
      type: "website",
    },
  };
}

/** Small colored pill used over photos and in the intro. */
function Pill({
  children,
  variant = "green",
}: {
  children: React.ReactNode;
  variant?: "green" | "mint";
}) {
  const cls =
    variant === "mint"
      ? "bg-anamaya-mint/70 text-anamaya-olive-dark"
      : "bg-anamaya-green text-white";
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${cls}`}
    >
      {children}
    </span>
  );
}

function Byline({ post, dot }: { post: CategoryPost; dot: string }) {
  const bits = [
    post.author ? `By ${post.author}` : null,
    formatDate(post.date_published) || null,
    post.read_minutes ? `${post.read_minutes} min` : null,
  ].filter(Boolean) as string[];
  return <>{bits.join(` ${dot} `)}</>;
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const data = await getCategoryData(slug);
  if (!data) notFound();

  const { term, posts } = data;
  const lede = term.description?.trim() || GENERIC_LEDE;
  const count = posts.length;

  // Hero = newest post with an image; else newest post at all.
  const hero = posts.find((p) => p.image_url) ?? posts[0] ?? null;
  const rest = hero ? posts.filter((p) => p.id !== hero.id) : [];

  // Minimal, safe JSON-LD: a CollectionPage wrapping an ItemList of posts.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${term.name} — Anamaya`,
    description: lede,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.title,
        url: liveArticleUrl(p.url_path),
      })),
    },
  };

  return (
    <>
      {/* Shared site header (logo + user/avatar, then CALENDAR + MENU).
          Hand-built React pages don't inherit chrome from a template, so we
          render the same blocks blog-posts does — same wordmark logos. */}
      <UiTopBlock
        content={{
          logo_dark_url: "/journal/anamaya-word-on-light.webp",
          logo_light_url: "/journal/anamaya-word-on-dark.webp",
        }}
      />

      {/* Scoped styles: scrims + CSS multi-column masonry. */}
      <style>{cssScoped}</style>
      <script
        type="application/ld+json"
        // Escape <, >, & (and line separators) so a scraped post title can
        // never break out of the <script> tag or inject markup — titles are
        // untrusted WordPress content.
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <div className="bg-anamaya-cream">
        <div className="mx-auto max-w-6xl px-6 py-16">
          {/* ---------- INTRO ---------- */}
          <div className="mx-auto max-w-3xl text-center">
            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="font-heading mb-6 text-xs uppercase tracking-[0.2em]"
            >
              <a href="/" className="text-anamaya-teal hover:text-anamaya-green-dark">
                Home
              </a>
              <span className="mx-2 text-anamaya-mint">/</span>
              <a
                href="/blog-posts"
                className="text-anamaya-teal hover:text-anamaya-green-dark"
              >
                Blog Posts
              </a>
              <span className="mx-2 text-anamaya-mint">/</span>
              <span className="text-anamaya-olive-dark">{term.name}</span>
            </nav>

            <div className="mb-5">
              <Pill variant="mint">Category</Pill>
            </div>

            <h1 className="cat-headline font-heading text-anamaya-olive-dark">
              {term.name}
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-anamaya-charcoal/80">
              {lede}
            </p>

            {/* Count line with dashed mint rules */}
            <div className="font-heading mt-8 flex items-center justify-center gap-4 text-xs uppercase tracking-[0.25em] text-anamaya-olive-dark/80">
              <span className="cat-rule" aria-hidden />
              <span>
                {count} article{count === 1 ? "" : "s"}
              </span>
              <span className="cat-rule" aria-hidden />
            </div>
          </div>

          {/* ---------- EMPTY ---------- */}
          {count === 0 && (
            <div className="mt-16 rounded-2xl bg-white/60 px-6 py-20 text-center ring-1 ring-anamaya-mint/50">
              <p className="text-lg text-anamaya-charcoal/70">
                No stories here yet.
              </p>
            </div>
          )}

          {/* ---------- HERO ---------- */}
          {hero && (
            <a
              href={liveArticleUrl(hero.url_path)}
              target="_blank"
              rel="noopener"
              className="cat-hero group mt-14 block overflow-hidden rounded-2xl bg-anamaya-teal-muted"
            >
              {hero.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hero.image_url}
                  alt={hero.image_alt ?? hero.title}
                  loading="lazy"
                  className="cat-hero-img"
                />
              ) : (
                <div className="cat-hero-tint" aria-hidden />
              )}
              <span className="cat-scrim" aria-hidden />
              <div className="cat-hero-body">
                <div className="mb-3">
                  <Pill>{term.name}</Pill>
                </div>
                <h2 className="cat-hero-title font-heading text-white">
                  {hero.title}
                </h2>
                <p className="mt-3 text-sm text-white/85">
                  <Byline post={hero} dot="·" />
                </p>
              </div>
            </a>
          )}

          {/* ---------- MASONRY ---------- */}
          {rest.length > 0 && (
            <div className="mt-6 columns-1 gap-5 sm:columns-2 lg:columns-3">
              {rest.map((p) => (
                <a
                  key={p.id}
                  href={liveArticleUrl(p.url_path)}
                  target="_blank"
                  rel="noopener"
                  className="cat-card group bg-anamaya-teal-muted"
                >
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.image_alt ?? p.title}
                      loading="lazy"
                      className="cat-card-img"
                    />
                  ) : (
                    <div className="cat-card-tint" aria-hidden />
                  )}
                  <span className="cat-arrow" aria-hidden>
                    ↗
                  </span>
                  <span className="cat-scrim" aria-hidden />
                  <div className="cat-card-body">
                    <div className="mb-2">
                      <Pill>{term.name}</Pill>
                    </div>
                    <h3 className="cat-card-title font-heading text-white">
                      {p.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-white/80">
                      {[p.author, formatDate(p.date_published)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right-anchored slide-out menu the MENU button opens (via
          ChromeContext). Empty content falls back to the site's SIDE_MENU
          nav, so the drawer works without a per-page DB fetch. */}
      <UiSideMenuRightBlock content={{}} />
    </>
  );
}

// ~2/3 of the mockup's clamp(58px,12vw,132px). Scrim + masonry live here so
// the JSX stays readable; class names are prefixed `cat-` to avoid collisions.
const cssScoped = `
.cat-headline {
  font-size: clamp(38px, 8vw, 84px);
  line-height: 0.92;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  text-wrap: balance;
}
.cat-rule {
  display: inline-block;
  width: 48px;
  border-top: 1px dashed var(--color-anamaya-mint);
}
.cat-scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, transparent 38%, rgba(18,26,14,0.86) 100%);
}
/* Hero */
.cat-hero {
  position: relative;
  min-height: 440px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.cat-hero-img,
.cat-hero-tint {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 600ms ease;
}
.cat-hero-tint {
  background: linear-gradient(135deg, var(--color-anamaya-green), var(--color-anamaya-teal));
}
.cat-hero:hover .cat-hero-img { transform: scale(1.04); }
.cat-hero-body {
  position: relative;
  padding: 28px 32px 32px;
}
.cat-hero-title {
  font-size: clamp(28px, 4vw, 48px);
  line-height: 1.02;
  text-transform: uppercase;
  letter-spacing: 0.005em;
  text-wrap: balance;
}
/* Masonry item — the multi-column flow is handled by Tailwind
   columns-1 sm:columns-2 lg:columns-3 on the container, so breakpoints
   stay on the design system's scale. */
.cat-card {
  position: relative;
  display: block;
  break-inside: avoid;
  margin-bottom: 20px;
  border-radius: 16px;
  overflow: hidden;
}
.cat-card-img {
  display: block;
  width: 100%;
  height: auto;
  transition: transform 600ms ease;
}
.cat-card-tint {
  width: 100%;
  height: 220px;
  background: linear-gradient(135deg, var(--color-anamaya-teal), var(--color-anamaya-green));
}
.cat-card:hover .cat-card-img { transform: scale(1.05); }
.cat-card-body {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  padding: 16px 18px 18px;
}
.cat-card-title {
  font-size: 22px;
  line-height: 1.08;
  text-transform: uppercase;
  text-wrap: balance;
}
.cat-arrow {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: rgba(255,255,255,0.9);
  color: var(--color-anamaya-olive-dark);
  font-size: 15px;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 250ms ease, transform 250ms ease;
}
.cat-card:hover .cat-arrow { opacity: 1; transform: translateY(0); }
`;
