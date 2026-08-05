import type { Metadata } from "next";
import UiTopBlock from "@/components/blocks/UiTopBlock";
import UiSideMenuRightBlock from "@/components/blocks/UiSideMenuRightBlock";
import { getTagsData, type TagInfo, type TagPost } from "./data";
import TagsCloud from "./TagsCloud";

// Reads live from the staging DB per request.
export const dynamic = "force-dynamic";

const LEDE =
  "Every subject we write about, drifting together as a living cloud.";

const CARD_ROWS = 4; // rows shown per card before a "+N more" line

/** Serialize JSON-LD, escaping characters that could break out of the
 *  surrounding <script> tag. Tag names / post titles are untrusted
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
  const title = "Tags — Anamaya";
  return {
    title,
    description: LEDE,
    openGraph: { title, description: LEDE, type: "website" },
  };
}

export default async function TagsPage() {
  const { tags, postsByTag, totalTaggedPosts } = await getTagsData();

  const sizer = makeSizer(tags.map((t) => t.count));

  // Cloud order = ALPHABETICAL by name.
  const cloudTags = [...tags].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );

  // Initial card order = MOST POPULAR (count desc, then name asc).
  const sectionTags = [...tags].sort((a, b) => {
    const d = b.count - a.count;
    return d || a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  // Minimal, escaped JSON-LD: an ItemList of tags.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Tags — Anamaya",
    description: LEDE,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: sectionTags.map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.name,
      })),
    },
  };

  const renderRow = (p: TagPost) => {
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

  const renderCard = (t: TagInfo) => {
    const list = postsByTag[t.slug] ?? [];
    const shown = list.slice(0, CARD_ROWS);
    const extra = list.length - CARD_ROWS;
    return (
      <section
        key={t.slug}
        className="tsec"
        id={`tag-${t.slug}`}
        data-count={t.count}
        data-name={t.name.toLowerCase()}
      >
        <div className="tsec-h">
          <span className="flr flr-l" aria-hidden />
          <div className="tsec-ht">
            <h2>{t.name}</h2>
            <span className="tsec-n">
              {t.count} {t.count === 1 ? "story" : "stories"}
            </span>
          </div>
          <span className="flr flr-r" aria-hidden />
        </div>
        <div className="tsec-rows">{shown.map(renderRow)}</div>
        {extra > 0 && <div className="tmore">+ {extra} more</div>}
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

      <div id="tags-root">
        {/* ---------- MASTHEAD ---------- */}
        <section className="tg-col tg-mast">
          <h1 className="cat-title font-heading">Tags</h1>
          <p className="cat-lede">{LEDE}</p>
          <div className="count">
            {tags.length} {tags.length === 1 ? "tag" : "tags"} ·{" "}
            {totalTaggedPosts}{" "}
            {totalTaggedPosts === 1 ? "tagged story" : "tagged stories"}
          </div>
        </section>

        {/* ---------- TAG CLOUD (alphabetical) ---------- */}
        <div className="cloud" aria-label="Tag cloud">
          {cloudTags.map((t) => (
            <span
              key={t.slug}
              className="ctag"
              data-slug={t.slug}
              style={{ fontSize: `${sizer(t.count)}px` }}
            >
              {t.name.toUpperCase()}
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
          <div id="tsections">{sectionTags.map(renderCard)}</div>

          {tags.length === 0 && (
            <div className="tg-empty">No tagged stories yet.</div>
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

// Bespoke CSS, scoped under #tags-root so nothing leaks to other pages.
// Uses the SITE THEME TOKENS (var(--color-anamaya-*), var(--font-heading));
// the only literals are neutral paper/thumb tints with no token and the
// lightened-terracotta capsule colours.
const cssScoped = `
#tags-root {
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
#tags-root * { box-sizing: border-box; }
#tags-root a { color: inherit; text-decoration: none; }

/* ---- masthead ---- */
.tg-col { max-width: 940px; margin: 0 auto; padding: 0 28px; }
.tg-mast { padding: 66px 0 6px; text-align: center; }
#tags-root .kicker {
  font-family: var(--font-heading); font-weight: 500; font-size: 12px;
  letter-spacing: .34em; text-transform: uppercase;
  color: var(--color-anamaya-teal-muted); margin-bottom: 16px;
}
#tags-root .cat-title {
  font-weight: 600; text-transform: uppercase;
  font-size: clamp(56px, 11vw, 120px); line-height: .9;
  color: var(--color-anamaya-olive-dark); margin: 0;
}
#tags-root .cat-lede {
  max-width: 560px; margin: 20px auto 0; color: var(--tg-soft);
  font-size: 17px; line-height: 1.65;
}
#tags-root .count {
  margin-top: 18px; font-family: var(--font-heading); font-weight: 500;
  font-size: 12px; letter-spacing: .26em; text-transform: uppercase;
  color: var(--tg-faint);
}
#tags-root .count::before, #tags-root .count::after {
  content: ""; display: inline-block; width: 24px; height: 1px;
  background: var(--color-anamaya-mint); vertical-align: middle; margin: 0 12px;
}

/* ---- TAG CLOUD ---- */
#tags-root .cloud {
  position: relative; width: 90%; max-width: 1500px; margin: 30px auto 16px;
  text-align: center; line-height: 1.95; padding: 44px 12px 30px; overflow: visible;
}
#tags-root .ctag {
  display: inline-block; position: relative; font-family: var(--font-heading);
  font-weight: 600; text-transform: uppercase; letter-spacing: .01em;
  opacity: .7; margin: -3px -9px; padding: 0 7px; cursor: pointer;
  white-space: nowrap; color: var(--color-anamaya-olive);
  will-change: transform; transition: color 5s ease-in-out;
}
#tags-root .ctag:hover { opacity: .95; }
#tags-root .cloudhint {
  font-family: var(--font-heading); font-weight: 500; font-size: 11px;
  letter-spacing: .24em; text-transform: uppercase; color: var(--tg-faint);
  text-align: center; margin: 2px 0 0;
}

/* ---- SORT CAPSULES ---- */
.tagwrap { width: 80%; max-width: 1180px; margin: 0 auto; padding: 0 16px; }
@media (max-width: 600px) { .tagwrap { width: 92%; } }
#tags-root .sortbar { display: flex; gap: 10px; align-items: center; margin: 48px 0 24px; }
#tags-root .cap {
  font-family: var(--font-heading); font-weight: 500; font-size: 12px;
  letter-spacing: .16em; text-transform: uppercase; color: #fff;
  background: #d6aaa5; /* lightened terracotta (unselected) */
  border: none; border-radius: 999px; padding: 9px 18px; cursor: pointer;
  transition: background .2s;
}
#tags-root .cap.on { background: var(--color-anamaya-accent); }
#tags-root .cap:hover:not(.on) { background: #c98e88; }

/* ---- TAG CARDS: up to 3 wide, centered, responsive ---- */
#tags-root #tsections {
  display: flex; flex-wrap: wrap; justify-content: center;
  align-items: flex-start; gap: 22px;
}
#tags-root .tsec {
  flex: 0 1 calc((100% - 44px) / 3); max-width: calc((100% - 44px) / 3);
  background: #fff; border: 1px solid var(--tg-line); border-radius: 13px;
  padding: 16px 18px 12px; scroll-margin-top: 20px; transition: border-color .2s;
}
#tags-root .tsec:hover { border-color: var(--color-anamaya-teal-muted); }
@media (max-width: 900px) {
  #tags-root .tsec { flex-basis: calc((100% - 22px) / 2); max-width: calc((100% - 22px) / 2); }
}
@media (max-width: 600px) {
  #tags-root .tsec { flex-basis: 100%; max-width: 100%; }
}
#tags-root .tsec-h {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  margin: 0 0 8px; border-bottom: 1px solid var(--tg-line); padding-bottom: 10px;
}
#tags-root .tsec-ht {
  display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0;
}
#tags-root .tsec-h h2 {
  font-family: var(--font-heading); font-weight: 600; font-size: 20px;
  letter-spacing: .01em; color: var(--color-anamaya-olive-dark); margin: 0;
  text-transform: capitalize; line-height: 1.1; text-align: center;
}
#tags-root .tsec-n {
  font-family: var(--font-heading); font-weight: 500; font-size: 10px;
  letter-spacing: .16em; text-transform: uppercase; color: var(--tg-faint);
  white-space: nowrap;
}
#tags-root .flr {
  flex: none; width: 34px; height: 30px; opacity: .5;
  background: url('/journal/flower-sideways-right.webp') center/contain no-repeat;
}
#tags-root .flr-l { transform: scaleX(-1); }
#tags-root .tsec-rows { display: flex; flex-direction: column; }
#tags-root .row {
  display: grid; grid-template-columns: 73px 1fr; gap: 14px; align-items: center;
  padding: 11px 2px; border-bottom: 1px solid var(--tg-line); transition: background .18s;
}
#tags-root .tsec-rows .row:last-child { border-bottom: 0; }
#tags-root .row:hover { background: color-mix(in srgb, var(--color-anamaya-green) 6%, transparent); }
#tags-root .rthumb {
  width: 73px; height: 62px; border-radius: 6px; object-fit: cover;
  background-size: cover; background-position: center; background-color: #eef1ec;
  display: block;
}
#tags-root .rtint {
  background: linear-gradient(135deg, var(--color-anamaya-teal), var(--color-anamaya-green));
}
#tags-root .rbody { min-width: 0; }
#tags-root .rtitle {
  display: block; font-family: var(--font-heading); font-weight: 600;
  font-size: 16px; line-height: 1.13; color: var(--color-anamaya-charcoal);
  letter-spacing: .006em; transition: color .18s;
}
#tags-root .row:hover .rtitle { color: var(--color-anamaya-green-dark); }
#tags-root .rmeta {
  display: block; margin-top: 3px; font-family: var(--font-heading);
  font-weight: 500; font-size: 10px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--tg-faint);
}
#tags-root .tmore {
  font-family: var(--font-heading); font-weight: 500; font-size: 11px;
  letter-spacing: .12em; text-transform: uppercase; color: var(--color-anamaya-teal-muted);
  padding: 11px 2px 4px;
}
#tags-root .tg-empty {
  text-align: center; color: var(--tg-soft); padding: 60px 0;
}
@media (prefers-reduced-motion: reduce) {
  #tags-root .ctag { transition: none !important; }
}
`;
