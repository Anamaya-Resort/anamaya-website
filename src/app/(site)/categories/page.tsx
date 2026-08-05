import type { Metadata } from "next";
import UiTopBlock from "@/components/blocks/UiTopBlock";
import UiSideMenuRightBlock from "@/components/blocks/UiSideMenuRightBlock";
import { getCategoriesData, type CatInfo, type CatPost } from "./data";
// Reuse the /tags cloud behaviour controller verbatim — it keys off the same
// DOM contract (.cloud / .ctag[data-slug] / #tsections / #cap-pop / #cap-alpha
// and scrolls to #tag-{slug}), so the card ids below stay `tag-…` on purpose.
import TagsCloud from "../tags/TagsCloud";

// Reads live from the staging DB per request.
export const dynamic = "force-dynamic";

const LEDE =
  "Every topic we write about, drifting together as a living cloud.";

const CARD_ROWS = 4; // rows shown per card before a "+N more" line

/** Serialize JSON-LD, escaping characters that could break out of the
 *  surrounding <script> tag. Category names / post titles are untrusted
 *  (scraped WordPress) content. */
function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/** Same-site RELATIVE article URL (stays on the current host). */
function liveArticleUrl(urlPath: string): string {
  return urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
}

const MONTHS = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2 Aug 2026" from an ISO date. Returns "" for missing/invalid. */
function monthYear(iso: string | null): string {
  if (!iso) return "";
  const [y, m, dRaw] = iso.split("T")[0].split("-");
  const day = parseInt(dRaw ?? "", 10);
  const mon = MONTHS[parseInt(m ?? "", 10)] ?? "";
  if (!y) return "";
  return day && mon ? `${day} ${mon} ${y}` : y;
}

/** Cloud font-size (px) by popularity — sqrt scale ~14..42. */
function makeSizer(counts: number[]): (c: number) => number {
  const cmax = counts.length ? Math.max(...counts) : 1;
  const cmin = counts.length ? Math.min(...counts) : 1;
  return (c: number) => {
    if (cmax === cmin) return 22;
    const t = (c - cmin) / (cmax - cmin);
    return Math.round((14 + (42 - 14) * Math.sqrt(t)) * 10) / 10;
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const title = "Categories — Anamaya";
  return {
    title,
    description: LEDE,
    openGraph: { title, description: LEDE, type: "website" },
  };
}

export default async function CategoriesPage() {
  const { cats, postsByCat, totalCategorizedPosts } = await getCategoriesData();

  const sizer = makeSizer(cats.map((c) => c.count));

  // Cloud order = ALPHABETICAL by name.
  const cloudCats = [...cats].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );

  // Initial card order = MOST POPULAR (count desc, then name asc).
  const sectionCats = [...cats].sort((a, b) => {
    const d = b.count - a.count;
    return d || a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  // Minimal, escaped JSON-LD: an ItemList of categories.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Categories — Anamaya",
    description: LEDE,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: sectionCats.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        url: `/category/${c.slug}`,
      })),
    },
  };

  const renderRow = (p: CatPost) => {
    const meta = [p.author ?? "", monthYear(p.date_published)]
      .filter(Boolean)
      .join(" · ");
    return (
      <a
        key={p.id}
        className="row"
        href={liveArticleUrl(p.url_path)}
        target="_blank"
        rel="noopener"
      >
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="rthumb" src={p.image_url} alt={p.title} loading="lazy" />
        ) : (
          <span className="rthumb rtint" aria-hidden />
        )}
        <span className="rbody">
          <span className="rtitle">{p.title}</span>
          <span className="rmeta">{meta}</span>
        </span>
      </a>
    );
  };

  const renderCard = (c: CatInfo) => {
    const list = postsByCat[c.slug] ?? [];
    const shown = list.slice(0, CARD_ROWS);
    const extra = list.length - CARD_ROWS;
    return (
      <section
        key={c.slug}
        className="tsec"
        // `tag-` prefix kept so the reused TagsCloud scroll-to still targets it.
        id={`tag-${c.slug}`}
        data-count={c.count}
        data-name={c.name.toLowerCase()}
      >
        <div className="tsec-h">
          <span className="flr flr-l" aria-hidden />
          <div className="tsec-ht">
            <h2>
              {/* Category name links to its dedicated /category/{slug} page. */}
              <a href={`/category/${c.slug}`}>{c.name}</a>
            </h2>
            <span className="tsec-n">
              {c.count} {c.count === 1 ? "story" : "stories"}
            </span>
          </div>
          <span className="flr flr-r" aria-hidden />
        </div>
        <div className="tsec-rows">{shown.map(renderRow)}</div>
        {extra > 0 && (
          <a className="tmore" href={`/category/${c.slug}`}>
            + {extra} more
          </a>
        )}
      </section>
    );
  };

  return (
    <>
      {/* Shared site header — same wordmark logos the category page passes. */}
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

      <div id="cats-root">
        {/* ---------- MASTHEAD ---------- */}
        <section className="tg-col tg-mast">
          <h1 className="cat-title font-heading">Categories</h1>
          <p className="cat-lede">{LEDE}</p>
          <div className="count">
            {cats.length} {cats.length === 1 ? "category" : "categories"} ·{" "}
            {totalCategorizedPosts}{" "}
            {totalCategorizedPosts === 1 ? "story" : "stories"}
          </div>
        </section>

        {/* ---------- CATEGORY CLOUD (alphabetical) ---------- */}
        <div className="cloud" aria-label="Category cloud">
          {cloudCats.map((c) => (
            <span
              key={c.slug}
              className="ctag"
              data-slug={c.slug}
              style={{ fontSize: `${sizer(c.count)}px` }}
            >
              {c.name.toUpperCase()}
            </span>
          ))}
        </div>

        {/* ---------- SORT + CARDS ---------- */}
        <div className="tagwrap">
          <div className="sortbar">
            <button id="cap-pop" className="cap on" type="button">
              Most popular
            </button>
            <button id="cap-alpha" className="cap" type="button">
              Alphabetical
            </button>
          </div>
          <div id="tsections">{sectionCats.map(renderCard)}</div>

          {cats.length === 0 && (
            <div className="tg-empty">No categorized stories yet.</div>
          )}
        </div>
      </div>

      {/* Client behaviour: spiral animation + sort capsules. Renders null. */}
      <TagsCloud />

      {/* Right-anchored slide-out menu the MENU button opens. */}
      <UiSideMenuRightBlock content={{}} />
    </>
  );
}

// Bespoke CSS, scoped under #cats-root so nothing leaks to other pages.
// Uses the SITE THEME TOKENS (var(--color-anamaya-*), var(--font-heading));
// the only literals are neutral paper/thumb tints with no token and the
// lightened-terracotta capsule colours. (Same styling as the /tags page.)
const cssScoped = `
#cats-root {
  --tg-line: color-mix(in srgb, var(--color-anamaya-mint) 60%, transparent);
  --tg-soft: color-mix(in srgb, var(--color-anamaya-charcoal) 62%, transparent);
  --tg-faint: color-mix(in srgb, var(--color-anamaya-olive-dark) 52%, transparent);
  background: var(--color-anamaya-cream);
  color: var(--color-anamaya-charcoal);
  font-size: 17px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  padding-bottom: 8px;
}
#cats-root * { box-sizing: border-box; }
#cats-root a { color: inherit; text-decoration: none; }

/* ---- masthead ---- */
.tg-col { max-width: 940px; margin: 0 auto; padding: 0 28px; }
.tg-mast { padding: 66px 0 6px; text-align: center; }
#cats-root .cat-title {
  font-weight: 600; text-transform: uppercase;
  font-size: clamp(56px, 11vw, 120px); line-height: .9;
  color: var(--color-anamaya-olive-dark); margin: 0;
}
#cats-root .cat-lede {
  max-width: 560px; margin: 20px auto 0; color: var(--tg-soft);
  font-size: 17px; line-height: 1.65;
}
#cats-root .count {
  margin-top: 18px; font-family: var(--font-heading); font-weight: 500;
  font-size: 12px; letter-spacing: .26em; text-transform: uppercase;
  color: var(--tg-faint);
}
#cats-root .count::before, #cats-root .count::after {
  content: ""; display: inline-block; width: 24px; height: 1px;
  background: var(--color-anamaya-mint); vertical-align: middle; margin: 0 12px;
}

/* ---- CATEGORY CLOUD ---- */
#cats-root .cloud {
  position: relative; width: 90%; max-width: 1500px; margin: 30px auto 16px;
  text-align: center; line-height: 1.95; padding: 44px 12px 30px; overflow: visible;
}
#cats-root .ctag {
  display: inline-block; position: relative; font-family: var(--font-heading);
  font-weight: 600; text-transform: uppercase; letter-spacing: .01em;
  opacity: .7; margin: -3px -9px; padding: 0 7px; cursor: pointer;
  white-space: nowrap; color: var(--color-anamaya-olive);
  will-change: transform; transition: color 5s ease-in-out;
}
#cats-root .ctag:hover { opacity: .95; }

/* ---- SORT CAPSULES ---- */
.tagwrap { width: 80%; max-width: 1180px; margin: 0 auto; padding: 0 16px; }
@media (max-width: 600px) { .tagwrap { width: 92%; } }
#cats-root .sortbar { display: flex; gap: 10px; align-items: center; margin: 48px 0 24px; }
#cats-root .cap {
  font-family: var(--font-heading); font-weight: 500; font-size: 12px;
  letter-spacing: .16em; text-transform: uppercase; color: #fff;
  background: #d6aaa5; /* lightened terracotta (unselected) */
  border: none; border-radius: 999px; padding: 9px 18px; cursor: pointer;
  transition: background .2s;
}
#cats-root .cap.on { background: var(--color-anamaya-accent); }
#cats-root .cap:hover:not(.on) { background: #c98e88; }

/* ---- CATEGORY CARDS: up to 3 wide, centered, responsive ---- */
#cats-root #tsections {
  display: flex; flex-wrap: wrap; justify-content: center;
  align-items: flex-start; gap: 22px;
}
#cats-root .tsec {
  flex: 0 1 calc((100% - 44px) / 3); max-width: calc((100% - 44px) / 3);
  background: #fff; border: 1px solid var(--tg-line); border-radius: 13px;
  padding: 16px 18px 12px; scroll-margin-top: 20px; transition: border-color .2s;
}
#cats-root .tsec:hover { border-color: var(--color-anamaya-teal-muted); }
@media (max-width: 900px) {
  #cats-root .tsec { flex-basis: calc((100% - 22px) / 2); max-width: calc((100% - 22px) / 2); }
}
@media (max-width: 600px) {
  #cats-root .tsec { flex-basis: 100%; max-width: 100%; }
}
#cats-root .tsec-h {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  margin: 0 0 8px; border-bottom: 1px solid var(--tg-line); padding-bottom: 10px;
}
#cats-root .tsec-ht {
  display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0;
}
#cats-root .tsec-h h2 {
  font-family: var(--font-heading); font-weight: 600; font-size: 20px;
  letter-spacing: .01em; color: var(--color-anamaya-olive-dark); margin: 0;
  text-transform: capitalize; line-height: 1.1; text-align: center;
}
#cats-root .tsec-h h2 a { transition: color .18s; }
#cats-root .tsec-h h2 a:hover { color: var(--color-anamaya-green-dark); }
#cats-root .tsec-n {
  font-family: var(--font-heading); font-weight: 500; font-size: 10px;
  letter-spacing: .16em; text-transform: uppercase; color: var(--tg-faint);
  white-space: nowrap;
}
#cats-root .flr {
  flex: none; width: 34px; height: 30px; opacity: .5;
  background: url('/journal/flower-sideways-right.webp') center/contain no-repeat;
}
#cats-root .flr-l { transform: scaleX(-1); }
#cats-root .tsec-rows { display: flex; flex-direction: column; }
#cats-root .row {
  display: grid; grid-template-columns: 73px 1fr; gap: 14px; align-items: center;
  padding: 11px 2px; border-bottom: 1px solid var(--tg-line); transition: background .18s;
}
#cats-root .tsec-rows .row:last-child { border-bottom: 0; }
#cats-root .row:hover { background: color-mix(in srgb, var(--color-anamaya-green) 6%, transparent); }
#cats-root .rthumb {
  width: 73px; height: 62px; border-radius: 6px; object-fit: cover;
  background-size: cover; background-position: center; background-color: #eef1ec;
  display: block;
}
#cats-root .rtint {
  background: linear-gradient(135deg, var(--color-anamaya-teal), var(--color-anamaya-green));
}
#cats-root .rbody { min-width: 0; }
#cats-root .rtitle {
  display: block; font-family: var(--font-heading); font-weight: 600;
  font-size: 16px; line-height: 1.13; color: var(--color-anamaya-charcoal);
  letter-spacing: .006em; transition: color .18s;
}
#cats-root .row:hover .rtitle { color: var(--color-anamaya-green-dark); }
#cats-root .rmeta {
  display: block; margin-top: 3px; font-family: var(--font-heading);
  font-weight: 500; font-size: 10px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--tg-faint);
}
#cats-root .tmore {
  display: block; font-family: var(--font-heading); font-weight: 500; font-size: 11px;
  letter-spacing: .12em; text-transform: uppercase; color: var(--color-anamaya-teal-muted);
  padding: 11px 2px 4px;
}
#cats-root .tg-empty {
  text-align: center; color: var(--tg-soft); padding: 60px 0;
}
@media (prefers-reduced-motion: reduce) {
  #cats-root .ctag { transition: none !important; }
}
`;
