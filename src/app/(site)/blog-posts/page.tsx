import type { Metadata } from "next";
import UiTopBlock from "@/components/blocks/UiTopBlock";
import { getBlogIndexData, type BlogPost } from "./data";
import { formatDate, liveArticleUrl } from "./helpers";

// Reads live from the staging DB per request, so new posts and edits show
// up without a redeploy.
export const dynamic = "force-dynamic";

const LEDE =
  "Yoga, healing and transformational travel — written by the teachers and guests of Anamaya, Costa Rica.";

export const metadata: Metadata = {
  title: "The Anamaya Journal — Stories, Yoga & Wellness",
  description: LEDE,
  openGraph: {
    title: "The Anamaya Journal",
    description: LEDE,
    type: "website",
  },
};

/** Escape <, >, & so a scraped post title can't break out of the
 *  JSON-LD <script>. Titles are untrusted WordPress content. */
function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/** The green flourish that brackets each story's text. The bottom copy is
 *  as-supplied; the top copy is rotated 180° so the pair is symmetric. */
function Flourish({ flip = false }: { flip?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`bx-flourish${flip ? " bx-flip" : ""}`}
      src="/journal/flourish.webp"
      alt=""
      aria-hidden="true"
    />
  );
}

function StoryRow({ post, flip }: { post: BlogPost; flip: boolean }) {
  return (
    <a
      className={`bx-row${flip ? " bx-row-flip" : ""}`}
      href={liveArticleUrl(post.url_path)}
      target="_blank"
      rel="noopener"
    >
      <div className="bx-row-img">
        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt={post.image_alt ?? post.title} loading="lazy" />
        ) : (
          <div className="bx-row-tint" aria-hidden="true" />
        )}
      </div>
      <div className="bx-row-txt">
        <Flourish flip />
        {post.category && <span className="bx-cat">{post.category}</span>}
        <h3 className="bx-row-title">{post.title}</h3>
        {post.excerpt && <p className="bx-row-exc">{post.excerpt}</p>}
        <span className="bx-row-foot">
          {[post.author, formatDate(post.date_published)].filter(Boolean).join(" · ") ||
            "Anamaya, Montezuma"}{" "}
          &#8594;
        </span>
        <Flourish />
      </div>
    </a>
  );
}

/** A right-column card: heading + a compact list of small article items. */
function RightSection({ title, items }: { title: string; items: BlogPost[] }) {
  return (
    <div className="bx-rcard">
      <span className="bx-rtitle">{title}</span>
      {items.length === 0 ? (
        <p className="bx-rempty">Nothing here yet.</p>
      ) : (
        <ul className="bx-rlist">
          {items.map((p) => (
            <li key={p.id}>
              <a
                className="bx-ritem"
                href={liveArticleUrl(p.url_path)}
                target="_blank"
                rel="noopener"
              >
                <span className="bx-rthumb">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" loading="lazy" />
                  ) : (
                    <span className="bx-rthumb-tint" aria-hidden="true" />
                  )}
                </span>
                <span className="bx-rmeta">
                  {p.category && <span className="bx-rcat">{p.category}</span>}
                  <span className="bx-rname">{p.title}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function BlogIndexPage() {
  const data = await getBlogIndexData();
  const posts = data?.posts ?? [];
  const categories = data?.categories ?? [];
  const total = data?.total ?? 0;
  const recents = data?.recents ?? [];
  const favorites = data?.favorites ?? [];
  const featured = data?.featured ?? [];

  // Featured = newest post that has an image, else newest post at all.
  const hero = posts.find((p) => p.image_url) ?? posts[0] ?? null;
  const rest = hero ? posts.filter((p) => p.id !== hero.id) : [];

  // The archive is large (hundreds of posts). Render only the latest slice
  // as full rows so the page stays light; the "Browse by" sidebar is how
  // visitors reach the rest. (Pagination / load-more is the next step.)
  const VISIBLE_ROWS = 30;
  const shown = rest.slice(0, VISIBLE_ROWS);
  const hiddenCount = rest.length - shown.length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "The Anamaya Journal",
    description: LEDE,
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
      {/* The real site top bar (logo + CALENDAR + MENU). Hand-built React
          pages don't get chrome from a template, so we render the block.
          New wordmark logos: dark lettering on the light/white bar, white
          lettering if the bar ever floats over a dark hero. */}
      <UiTopBlock
        content={{
          logo_dark_url: "/journal/anamaya-word-on-light.webp",
          logo_light_url: "/journal/anamaya-word-on-dark.webp",
        }}
      />

      <style>{cssScoped}</style>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <div className="bx">
        <main className="bx-main">
          {/* ---------- HERO ---------- */}
          {hero && (
            <a
              className="bx-hero"
              href={liveArticleUrl(hero.url_path)}
              target="_blank"
              rel="noopener"
            >
              {hero.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hero.image_url} alt={hero.image_alt ?? hero.title} className="bx-hero-img" />
              ) : (
                <div className="bx-hero-tint" aria-hidden="true" />
              )}
              <span className="bx-scrim" aria-hidden="true" />
              <div className="bx-hero-body">
                {hero.category && <span className="bx-pill">{hero.category}</span>}
                <h1 className="bx-hero-title">{hero.title}</h1>
                <p className="bx-hero-byl">
                  {[hero.author, formatDate(hero.date_published)]
                    .filter(Boolean)
                    .join(" · ") || "Anamaya, Montezuma"}
                </p>
              </div>
            </a>
          )}

          {/* ---------- SIDEBAR + STORY ROWS ---------- */}
          <div className="bx-body">
            <aside className="bx-side">
              <span className="bx-eyebrow">Browse by</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="bx-endcap" src="/journal/flower-divider.webp" alt="" aria-hidden="true" />
              <ul>
                <li>
                  <a href="/blog-posts">
                    <b>All Stories</b>
                    <em>{total}</em>
                  </a>
                </li>
                {categories.map((c) => (
                  <li key={c.slug}>
                    <a href={`/category/${c.slug}`}>
                      <b>{c.name}</b>
                      <em>{c.count}</em>
                    </a>
                  </li>
                ))}
              </ul>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="bx-endcap" src="/journal/flower-divider.webp" alt="" aria-hidden="true" />
            </aside>

            <div className="bx-rows">
              {rest.length === 0 && !hero ? (
                <p className="bx-empty">No stories here yet.</p>
              ) : (
                <>
                  {shown.map((p, i) => (
                    <StoryRow key={p.id} post={p} flip={i % 2 === 1} />
                  ))}
                  {hiddenCount > 0 && (
                    <p className="bx-more">
                      Showing the {shown.length} latest stories. Browse the other{" "}
                      {hiddenCount} by category above.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* ---------- RIGHT COLUMN ---------- */}
            <aside className="bx-right">
              <RightSection title="Recents" items={recents} />
              <RightSection title="Favorites" items={favorites} />
              <RightSection title="Featured" items={featured} />
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}

// Scoped styles for the blog index. Class names are prefixed `bx-` to avoid
// collisions; colours/fonts come from the site theme (globals.css @theme:
// --color-anamaya-*, --font-heading). Local ink/line vars are warm-biased.
const cssScoped = `
.bx {
  --ink: #3a3f30;
  --ink-soft: rgba(68,68,68,.82);
  --ink-faint: rgba(68,68,68,.55);
  --line: #e7e3d7;
  --line-2: #d7d2c2;
  --scrim: linear-gradient(180deg, transparent 34%, rgba(18,26,14,.86) 100%);
  background: var(--color-anamaya-cream);
  color: var(--color-anamaya-charcoal);
}
.bx-main { width: 90%; max-width: 1600px; margin: 0 auto; padding: 8px 0 96px; }

.bx-pill, .bx-cat {
  font-family: var(--font-heading), sans-serif;
  text-transform: uppercase; letter-spacing: .18em;
  font-size: 11px; font-weight: 600;
}
.bx-pill { display: inline-block; padding: 5px 12px; border-radius: 999px;
  background: var(--color-anamaya-green); color: #fff; }
.bx-cat { color: var(--color-anamaya-green); margin-top: 2px; }
.bx-eyebrow { font-family: var(--font-heading), sans-serif; text-transform: uppercase;
  letter-spacing: .2em; font-size: 12px; font-weight: 600; color: var(--color-anamaya-olive-dark); }

/* ---------- HERO ---------- */
.bx-hero { position: relative; display: flex; flex-direction: column; justify-content: flex-end;
  min-height: clamp(360px, 52vh, 560px); border-radius: 8px; overflow: hidden;
  background: var(--color-anamaya-teal-muted); }
.bx-hero-img, .bx-hero-tint { position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; transition: transform .6s cubic-bezier(.2,.7,.2,1); }
.bx-hero-tint { background: linear-gradient(135deg, var(--color-anamaya-green), var(--color-anamaya-teal)); }
.bx-hero:hover .bx-hero-img { transform: scale(1.03); }
.bx-scrim { position: absolute; inset: 0; background: var(--scrim); pointer-events: none; }
.bx-hero-body { position: relative; z-index: 2; padding: clamp(24px, 4vw, 52px); }
.bx-hero-title { font-family: var(--font-heading), sans-serif; text-transform: uppercase;
  text-wrap: balance; color: #fff; font-size: clamp(30px, 5.2vw, 62px); line-height: .95;
  letter-spacing: .005em; margin: 14px 0 0; max-width: 18ch; }
.bx-hero-byl { color: rgba(255,255,255,.85); font-size: 14px; margin: 14px 0 0; }

/* ---------- BODY: sidebar + rows ---------- */
.bx-body { display: grid; grid-template-columns: 1fr; gap: 34px; margin-top: 36px; }
/* Tablet: Browse-by + main list side by side; right column spans full width below. */
@media (min-width: 900px) {
  .bx-body { grid-template-columns: 214px minmax(0, 1fr); gap: 52px; }
  .bx-right { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
}
@media (min-width: 900px) { .bx-side { position: sticky; top: 100px; align-self: start; } }
/* Desktop: three columns — Browse-by · main list · right column. */
@media (min-width: 1200px) {
  .bx-body { grid-template-columns: 214px minmax(0, 1fr) 300px; column-gap: 44px; }
  .bx-right { grid-column: auto; display: flex; flex-direction: column; gap: 22px; }
}

/* ---------- RIGHT COLUMN cards ---------- */
.bx-right { display: flex; flex-direction: column; gap: 22px; }
.bx-rcard { background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 15px 16px 18px; }
.bx-rtitle { display: block; font-family: var(--font-heading), sans-serif; text-transform: uppercase;
  letter-spacing: .16em; font-size: 13px; color: var(--color-anamaya-olive-dark);
  padding-bottom: 10px; margin-bottom: 12px; border-bottom: 1px solid var(--line); }
.bx-rlist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 13px; }
.bx-ritem { display: flex; gap: 11px; align-items: center; }
.bx-rthumb { flex: none; width: 52px; height: 52px; border-radius: 6px; overflow: hidden;
  background: var(--color-anamaya-teal-muted); }
.bx-rthumb img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.bx-ritem:hover .bx-rthumb img { transform: scale(1.06); }
.bx-rthumb-tint { display: block; width: 100%; height: 100%;
  background: linear-gradient(135deg, var(--color-anamaya-teal), var(--color-anamaya-green)); }
.bx-rmeta { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.bx-rcat { font-family: var(--font-heading), sans-serif; text-transform: uppercase;
  letter-spacing: .12em; font-size: 9.5px; color: var(--color-anamaya-green); }
.bx-rname { font-size: 13.5px; line-height: 1.25; color: var(--ink);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.bx-ritem:hover .bx-rname { color: var(--color-anamaya-olive-dark); }
.bx-rempty { color: var(--ink-faint); font-size: 13px; margin: 2px 0 0; }
.bx-side .bx-eyebrow { display: block; margin-bottom: 2px; }
.bx-side ul { list-style: none; margin: 0; padding: 0; }
.bx-side li a { display: flex; justify-content: space-between; align-items: center; gap: 10px;
  padding: 10px 4px; color: var(--ink-soft); font-size: 15px;
  border-bottom: 1px solid var(--line); transition: color .18s, padding .18s; }
.bx-side li:last-child a { border-bottom: 0; }
.bx-side li a:hover { color: var(--color-anamaya-olive-dark); padding-left: 8px; }
.bx-side li a b { font-weight: 500; }
.bx-side li a em { font-style: normal; color: var(--ink-faint);
  font-family: var(--font-heading), sans-serif; font-size: 12.5px; letter-spacing: .06em; }
/* Flower line-break endcaps bracketing the category list. */
.bx-endcap { display: block; width: 100%; max-width: 220px; height: auto; margin: 10px auto; }

.bx-rows { display: flex; flex-direction: column; gap: 30px; }
.bx-row { display: grid; grid-template-columns: 1fr; background: #fff;
  border: 1px solid var(--line); border-radius: 8px; overflow: hidden; transition: box-shadow .25s; }
.bx-row:hover { box-shadow: 0 12px 34px rgba(55,64,42,.14); }
@media (min-width: 680px) {
  .bx-row { grid-template-columns: 1.25fr 1fr; }
  .bx-row-flip .bx-row-img { order: 2; }
}
.bx-row-img { position: relative; min-height: 240px; overflow: hidden; }
.bx-row-img img, .bx-row-tint { position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; transition: transform .6s cubic-bezier(.2,.7,.2,1); }
.bx-row-tint { background: linear-gradient(135deg, var(--color-anamaya-teal), var(--color-anamaya-green)); }
.bx-row:hover .bx-row-img img { transform: scale(1.05); }
.bx-row-txt { padding: clamp(24px, 2.6vw, 38px); display: flex; flex-direction: column;
  justify-content: center; align-items: center; text-align: center; gap: 12px; }
.bx-flourish { width: 172px; max-width: 64%; height: auto; display: block; }
.bx-flourish.bx-flip { transform: rotate(180deg); }
.bx-row-title { font-family: var(--font-heading), sans-serif; text-transform: uppercase;
  text-wrap: balance; font-size: clamp(21px, 2.3vw, 30px); line-height: 1.05;
  color: var(--ink); margin: 0; }
.bx-row-exc { margin: 0; color: var(--ink-soft); font-size: 15px; max-width: 44ch; }
.bx-row-foot { color: var(--color-anamaya-olive-dark); font-family: var(--font-heading), sans-serif;
  text-transform: uppercase; letter-spacing: .1em; font-size: 12px; font-weight: 600; }

.bx-empty { text-align: center; color: var(--ink-soft); padding: 60px 0; }
.bx-more { text-align: center; color: var(--ink-faint); font-size: 14px; padding: 8px 0 0; }

@media (prefers-reduced-motion: no-preference) {
  .bx-hero, .bx-row { animation: bx-rise .5s both; }
  @keyframes bx-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
}
`;
