import "server-only";

/**
 * Regex-based extractor for WP retreat pages (Elementor Theme Builder).
 * Operates on the cleaned `<div data-elementor-type="single-post">` body
 * already stored in `content_items.scraped_body_html`.
 *
 * Output mirrors the AnamayOS retreat schema closely enough that a
 * downstream push step can resolve fields without re-parsing. Anything
 * the extractor cannot confidently identify lands in `warnings` — the
 * admin reviews these in the staging UI before pushing to AO.
 *
 * No HTML parser dependency: same regex approach as `wp-rewrite.ts`.
 */

export type ExtractedTier = {
  name: string;
  price: string;
  note?: string;
  highlight?: boolean;
};

export type ExtractedItineraryDay = {
  day: string;
  title: string;
  description?: string;
};

export type ExtractedWorkshop = {
  title: string;
  description?: string;
  price?: string;
  image_url?: string;
};

export type ExtractedTestimonial = {
  quote: string;
  author?: string;
  photo_url?: string;
};

export type ExtractedRetreat = {
  name: string;
  tagline?: string;
  location?: string;
  dates_start?: string;
  dates_end?: string;
  dates_text?: string;

  retreat_leader?: {
    name?: string;
    credentials?: string;
    photo_url?: string;
    bio_html?: string;
  };

  pricing_tiers: ExtractedTier[];
  whats_included: string[];
  what_to_expect_html?: string;
  what_to_expect_text?: string;
  who_is_this_for_html?: string;
  who_is_this_for_text?: string;
  itinerary: ExtractedItineraryDay[];
  workshops: ExtractedWorkshop[];
  gallery_images: { url: string; alt?: string }[];
  testimonials: ExtractedTestimonial[];

  /** Original WP-Engine image URLs collected from the page (pre-import). */
  source_image_urls: string[];
};

export type ExtractResult = {
  retreat: ExtractedRetreat;
  warnings: string[];
};

// ── Helpers ──────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', "#039": "'", apos: "'",
  nbsp: " ", ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’",
  ldquo: "“", rdquo: "”", hellip: "…",
  "#8211": "–", "#8212": "—", "#8216": "‘", "#8217": "’",
  "#8220": "“", "#8221": "”", "#8230": "…",
};
function decode(s: string): string {
  return s.replace(/&(#?[a-z0-9]+);/gi, (_, k) => ENTITIES[k] ?? `&${k};`);
}

function stripTags(html: string): string {
  return decode(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

/** Split inner HTML on <br> (any variant) into an array of fragments. */
function splitOnBr(html: string): string[] {
  return html.split(/<br\s*\/?\s*>/gi);
}

/** Find every `<tag>...</tag>` block (non-greedy, balanced shallowly). */
function findTagBlocks(html: string, tag: string): { inner: string; full: string; index: number }[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: { inner: string; full: string; index: number }[] = [];
  for (const m of html.matchAll(re)) {
    out.push({ inner: m[1], full: m[0], index: m.index ?? 0 });
  }
  return out;
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1] : undefined;
}

/** All `<img>` tags in the html as objects with src/alt. */
function findImages(html: string): { src: string; alt?: string }[] {
  const out: { src: string; alt?: string }[] = [];
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = attr(tag, "src") ?? attr(tag, "data-src");
    if (!src) continue;
    out.push({ src, alt: attr(tag, "alt") });
  }
  return out;
}

/**
 * Find a section whose heading matches `headingPattern`. Returns the HTML
 * between that heading and the next H2/H3 (whichever comes first), or
 * null if not found.
 */
function findSectionByHeading(html: string, headingPattern: RegExp): string | null {
  const all = findSectionsByHeading(html, headingPattern);
  return all[0] ?? null;
}

/**
 * Like `findSectionByHeading` but returns every match. Useful when the
 * page has multiple plausibly-named headings (e.g. an Elementor template
 * with `<h4>Rates for Retreat</h4>` in one widget and the actual table
 * under `<h3>Women's Retreat Prices:</h3>` in the next) — callers can
 * try each in turn until one yields data.
 */
function findSectionsByHeading(html: string, headingPattern: RegExp): string[] {
  const headings: { index: number; level: number; text: string }[] = [];
  for (const m of html.matchAll(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    headings.push({
      index: m.index ?? 0,
      level: Number(m[1]),
      text: stripTags(m[2]),
    });
  }
  const out: string[] = [];
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    if (!headingPattern.test(h.text)) continue;
    const start = h.index;
    const end = headings.slice(i + 1).find((n) => n.level <= h.level)?.index ?? html.length;
    out.push(html.slice(start, end));
  }
  return out;
}

function uniq<T>(arr: T[], keyFn: (x: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const k = keyFn(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

// ── Field extractors ─────────────────────────────────────────────────

const MONTHS = "(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)";

/**
 * Match a date range like:
 *   "January 17 - 24, 2026"     (same month)
 *   "January 28 - February 4, 2026"  (cross month)
 *   "December 28, 2026 - January 4, 2027"  (cross year)
 */
function extractDates(text: string): { start?: string; end?: string; text?: string } {
  const reSameMonth = new RegExp(`(${MONTHS})\\s+(\\d{1,2})\\s*[-–]\\s*(\\d{1,2}),?\\s*(\\d{4})`, "i");
  const reCrossMonth = new RegExp(
    `(${MONTHS})\\s+(\\d{1,2})\\s*[-–]\\s*(${MONTHS})\\s+(\\d{1,2}),?\\s*(\\d{4})`,
    "i",
  );
  const reCrossYear = new RegExp(
    `(${MONTHS})\\s+(\\d{1,2}),?\\s*(\\d{4})\\s*[-–]\\s*(${MONTHS})\\s+(\\d{1,2}),?\\s*(\\d{4})`,
    "i",
  );

  let m = text.match(reCrossYear);
  if (m) {
    return {
      start: toIso(m[1], m[2], m[3]),
      end: toIso(m[4], m[5], m[6]),
      text: m[0],
    };
  }
  m = text.match(reCrossMonth);
  if (m) {
    return {
      start: toIso(m[1], m[2], m[5]),
      end: toIso(m[3], m[4], m[5]),
      text: m[0],
    };
  }
  m = text.match(reSameMonth);
  if (m) {
    return {
      start: toIso(m[1], m[2], m[4]),
      end: toIso(m[1], m[3], m[4]),
      text: m[0],
    };
  }
  return {};
}

function toIso(monthName: string, day: string, year: string): string {
  const key = monthName.toLowerCase().slice(0, 3);
  const monthIdx = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ].indexOf(key);
  const mm = String(monthIdx + 1).padStart(2, "0");
  const dd = String(Number(day)).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function extractGallery(html: string, sourceHosts: string[]): { url: string; alt?: string }[] {
  const imgs = findImages(html).filter((i) => sourceHosts.some((h) => i.src.includes(h)));
  return uniq(imgs, (i) => i.src).map((i) => ({ url: i.src, alt: i.alt }));
}

function extractListItems(html: string): string[] {
  const items: string[] = [];
  for (const li of findTagBlocks(html, "li")) {
    const text = stripTags(li.inner);
    if (text) items.push(text);
  }
  if (items.length > 0) return items;

  // Anamaya WP retreat pages render "Retreat Highlights" as paragraph
  // bullets — `<p><span><strong>Embodied Learning:</strong> body…</p>`
  // rather than a `<ul>`. Treat any paragraph that opens with a labelled
  // <strong>/<b> (allowing inert wrappers like <span>) as a list item.
  // Match `<strong>Label:</strong>` near the start so we don't sweep up
  // body paragraphs that just happen to bold a phrase mid-sentence.
  const LABELED_RE = /^(?:\s*<(?:span|em|i|u|font)\b[^>]*>)*\s*<(?:strong|b)\b[^>]*>([^<]{1,60})<\/(?:strong|b)>/i;
  for (const p of findTagBlocks(html, "p")) {
    const m = p.inner.match(LABELED_RE);
    if (!m) continue;
    const text = stripTags(p.inner);
    if (text) items.push(text);
  }
  return items;
}

/**
 * Pricing rows: `$1,234`, `From $999`, `Sold out`, `Pay what you can`.
 * Looks inside table rows or list items. Pairs each price with the
 * nearest preceding heading/strong text in the same block.
 */
function extractPricingTiers(html: string): ExtractedTier[] {
  const out: ExtractedTier[] = [];
  // Non-`g` for `.test()` (avoids lastIndex state-sharing bugs).
  const PRICE_RE = /(\$[\d,]+(?:\s*\/\s*\w+)?|Sold out|Pay what you can|Free|TBA)/i;
  const PRICE_RE_G = /(\$[\d,]+(?:\s*\/\s*\w+)?|Sold out|Pay what you can|Free|TBA)/gi;

  for (const tr of findTagBlocks(html, "tr")) {
    const cells = findTagBlocks(tr.inner, "td");
    if (cells.length < 2) continue;

    // BR-stacked layout (Anamaya WP retreat template): a single row with
    // labels stacked in one cell via <br> and prices stacked in another.
    // Pair them by index instead of treating the whole cell as one tier.
    const priceCellIdx = cells.findIndex((c) => PRICE_RE.test(stripTags(c.inner)));
    if (priceCellIdx === -1) continue;
    const labelCellIdx = cells.findIndex((c, i) => i !== priceCellIdx && stripTags(c.inner));
    const priceLines = splitOnBr(cells[priceCellIdx].inner)
      .map(stripTags)
      .filter((t) => PRICE_RE.test(t));
    const labelLines = labelCellIdx >= 0
      ? splitOnBr(cells[labelCellIdx].inner).map(stripTags).filter(Boolean)
      : [];
    if (priceLines.length > 1 && labelLines.length >= priceLines.length) {
      const offset = labelLines.length === priceLines.length + 1 ? 1 : 0;
      for (let i = 0; i < priceLines.length; i++) {
        out.push({ name: labelLines[i + offset] ?? `Tier ${i + 1}`, price: priceLines[i] });
      }
      continue;
    }

    const cellTexts = cells.map((c) => stripTags(c.inner)).filter(Boolean);
    const priceCell = cellTexts.find((t) => PRICE_RE.test(t));
    if (!priceCell) continue;
    const name = cellTexts.find((t) => t !== priceCell) ?? "Tier";
    out.push({ name, price: priceCell });
  }

  if (out.length === 0) {
    for (const li of findTagBlocks(html, "li")) {
      const text = stripTags(li.inner);
      const m = text.match(PRICE_RE_G);
      if (!m) continue;
      const price = m[0];
      const name = text.replace(price, "").replace(/[—–:-]+\s*$/, "").trim() || "Tier";
      out.push({ name, price });
    }
  }

  // Parallel-list pattern (Anamaya WP layout): a column of <strong> labels
  // followed by a column of $prices, both as separate paragraphs/lines.
  // Pair them by index. Skip the first label if it looks like a column
  // header (e.g. "Occupancy") rather than a tier name.
  if (out.length === 0) {
    const labels: string[] = [];
    for (const m of html.matchAll(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi)) {
      const t = stripTags(m[1]);
      if (t && !PRICE_RE.test(t)) labels.push(t);
    }
    const prices = stripTags(html).match(/\$[\d,]+(?:\s*\/\s*\w+)?/g) ?? [];
    if (prices.length > 0 && labels.length >= prices.length) {
      const offset = labels.length === prices.length + 1 ? 1 : 0;
      for (let i = 0; i < prices.length; i++) {
        out.push({ name: labels[i + offset], price: prices[i] });
      }
    }
  }

  // Last resort: just collect raw $prices from the section, naming them
  // "Tier 1", "Tier 2", … so the admin sees something to fix instead of
  // a silent "no pricing tiers detected".
  if (out.length === 0) {
    const prices = stripTags(html).match(/\$[\d,]+(?:\s*\/\s*\w+)?/g) ?? [];
    for (let i = 0; i < prices.length; i++) {
      out.push({ name: `Tier ${i + 1}`, price: prices[i] });
    }
  }

  return uniq(out, (t) => `${t.name}|${t.price}`);
}

/** Day-by-day itinerary parser. Looks for `Day 1`, `Day 2`, etc. headings. */
function extractItinerary(html: string): ExtractedItineraryDay[] {
  const out: ExtractedItineraryDay[] = [];
  const headings: { index: number; level: number; text: string; raw: string }[] = [];
  for (const m of html.matchAll(/<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = stripTags(m[2]);
    if (/^Day\s+\d+/i.test(text)) {
      headings.push({ index: m.index ?? 0, level: Number(m[1]), text, raw: m[0] });
    }
  }
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const next = headings[i + 1]?.index ?? html.length;
    const body = html.slice(h.index + h.raw.length, next);
    const dayMatch = h.text.match(/^Day\s+(\d+)\s*[—–:-]?\s*(.*)$/i);
    out.push({
      day: dayMatch ? `Day ${dayMatch[1]}` : h.text,
      title: dayMatch && dayMatch[2] ? dayMatch[2] : h.text,
      description: stripTags(body) || undefined,
    });
  }
  return out;
}

/** Pull pricing notes that look like workshop entries. */
function extractWorkshops(html: string): ExtractedWorkshop[] {
  const section = findSectionByHeading(html, /workshop/i);
  if (!section) return [];
  const items: ExtractedWorkshop[] = [];
  for (const block of findTagBlocks(section, "h3")) {
    const title = stripTags(block.inner);
    if (!title) continue;
    items.push({ title });
  }
  if (items.length === 0) {
    for (const li of findTagBlocks(section, "li")) {
      const text = stripTags(li.inner);
      if (text) items.push({ title: text });
    }
  }
  return items;
}

function extractTestimonials(html: string): ExtractedTestimonial[] {
  const out: ExtractedTestimonial[] = [];
  for (const block of findTagBlocks(html, "blockquote")) {
    const inner = block.inner;
    // Try <cite>…</cite> first, then trailing "— Author" / "- Author".
    let author: string | undefined;
    const cite = inner.match(/<cite\b[^>]*>([\s\S]*?)<\/cite>/i);
    if (cite) author = stripTags(cite[1]);
    let quote = stripTags(inner.replace(/<cite\b[^>]*>[\s\S]*?<\/cite>/i, ""));
    if (!author) {
      const dash = quote.match(/^(.*?)\s*[—–-]\s*([^—–-]+)$/);
      if (dash && dash[2].length < 80 && dash[1].length > 20) {
        quote = dash[1].trim();
        author = dash[2].trim();
      }
    }
    if (quote) out.push({ quote, author });
  }
  return out;
}

/**
 * Two strategies, in order:
 *   1. Find a "Retreat Leader / Your Guide / Your Host" labeled section.
 *   2. Anamaya WP pages don't use that label — they put the leader's name
 *      after a dash/em-dash in the page title (e.g. "Sacred Femme Women's
 *      Retreat – Sierra Kliscz"). Use that as a hint, then look for a
 *      heading in the body that contains those words and grab the photo
 *      and bio paragraphs near it.
 */
function extractRetreatLeader(
  html: string,
  pageTitle: string,
): ExtractedRetreat["retreat_leader"] | undefined {
  const labeled = findSectionByHeading(html, /(retreat[\s-]?leader|teacher|your host|about your guide|your guide)/i);
  if (labeled) {
    const photo = findImages(labeled)[0]?.src;
    const nameH = labeled.match(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const paragraphs = findTagBlocks(labeled, "p").map((p) => p.full).join("\n");
    return {
      name: nameH ? stripTags(nameH[1]) : undefined,
      photo_url: photo,
      bio_html: paragraphs || undefined,
    };
  }

  const titleHint = decode(pageTitle).match(/[—–-]\s*([A-Z][\w'’.\- ]+?)\s*$/);
  if (!titleHint) return undefined;
  const leaderName = titleHint[1].trim();
  const escaped = leaderName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headingRe = new RegExp(`<h([2-4])\\b[^>]*>\\s*([\\s\\S]*?${escaped}[\\s\\S]*?)<\\/h\\1>`, "i");
  const headingMatch = html.match(headingRe);
  if (!headingMatch) return { name: leaderName };

  const headingIdx = headingMatch.index ?? 0;
  const lookbackStart = Math.max(0, headingIdx - 800);
  const lookback = html.slice(lookbackStart, headingIdx);
  const photoMatch = [...lookback.matchAll(/<img\b[^>]*>/gi)].pop();
  const photo = photoMatch ? attr(photoMatch[0], "src") ?? attr(photoMatch[0], "data-src") : undefined;

  const afterHeading = html.slice(headingIdx + headingMatch[0].length);
  const nextH = afterHeading.search(/<h[1-4]\b/i);
  const bioRegion = nextH >= 0 ? afterHeading.slice(0, nextH) : afterHeading.slice(0, 4000);
  const bioParas = findTagBlocks(bioRegion, "p").map((p) => p.full).join("\n");

  return { name: leaderName, photo_url: photo, bio_html: bioParas || undefined };
}

// ── Top-level extractor ──────────────────────────────────────────────

export type ExtractInput = {
  /** url_inventory.title — already plain text. */
  title: string;
  /** url_inventory.url — used to derive slug + log warnings. */
  url: string;
  /** content_items.scraped_body_html — Elementor single-post container. */
  bodyHtml: string;
  /** Hosts whose images are candidates for the gallery (e.g. WP-engine). */
  sourceHosts: string[];
};

export function extractRetreat(input: ExtractInput): ExtractResult {
  const { title, url, bodyHtml, sourceHosts } = input;
  const warnings: string[] = [];
  if (!bodyHtml || bodyHtml.length < 500) {
    warnings.push("scraped_body_html is missing or too short (<500 chars)");
  }

  const plainText = stripTags(bodyHtml);

  // Tagline: first H2 that isn't a section header.
  let tagline: string | undefined;
  const h2s = findTagBlocks(bodyHtml, "h2").map((b) => stripTags(b.inner)).filter(Boolean);
  for (const text of h2s) {
    if (/(retreat|day\s+\d|workshop|pricing|rate|date|what'?s|who is|testimonial|gallery|location)/i.test(text)) {
      continue;
    }
    tagline = text;
    break;
  }
  if (!tagline) warnings.push("could not identify tagline (first non-section H2)");

  const dates = extractDates(plainText);
  if (!dates.start) warnings.push("could not parse retreat dates");

  // Location: look for "Costa Rica" / "Anamaya" / heading near top.
  let location: string | undefined;
  const locMatch = plainText.match(/(Anamaya[^.,\n]*?Costa Rica|[A-Z][a-zA-Z ]+,\s*Costa Rica)/);
  if (locMatch) location = locMatch[1].trim();

  // The Anamaya WP retreat template doesn't always render an explicit
  // "What's Included" list — many pages weave inclusions into prose under
  // "Retreat Details" or "Highlights". Only warn when a section IS found
  // but contains no list items, since that signals a parse miss.
  const whatsIncludedSection =
    findSectionByHeading(bodyHtml, /what'?s\s+included/i) ??
    findSectionByHeading(bodyHtml, /(retreat\s+highlights?|inclusions?|highlights?)/i);
  const whatsIncluded = whatsIncludedSection ? extractListItems(whatsIncludedSection) : [];
  if (whatsIncludedSection && whatsIncluded.length === 0) {
    warnings.push('"What\'s Included" section found but no list items parsed');
  }

  const whatToExpectSection = findSectionByHeading(bodyHtml, /what\s+to\s+expect/i);
  const whoIsThisForSection = findSectionByHeading(bodyHtml, /who\s+is\s+this\s+(for|retreat)/i);

  // Try each pricing-related heading match in turn. Anamaya's Elementor
  // retreat template often has a styled <h4>Rates for Retreat</h4> in
  // one widget and the actual table under <h3>Women's Retreat Prices:</h3>
  // in the next — taking only the first match misses the table entirely.
  const pricingSections = findSectionsByHeading(bodyHtml, /(pricing|prices?|rates?|cost|investment)/i);
  let pricingTiers: ExtractedTier[] = [];
  for (const section of pricingSections) {
    pricingTiers = extractPricingTiers(section);
    if (pricingTiers.length > 0) break;
  }
  if (pricingTiers.length === 0) pricingTiers = extractPricingTiers(bodyHtml);
  if (pricingTiers.length === 0) warnings.push("no pricing tiers detected");

  const itinerary = extractItinerary(bodyHtml);
  const workshops = extractWorkshops(bodyHtml);
  const testimonials = extractTestimonials(bodyHtml);
  const retreat_leader = extractRetreatLeader(bodyHtml, title);
  if (!retreat_leader?.name) warnings.push("could not identify retreat leader/teacher");

  const galleryImages = extractGallery(bodyHtml, sourceHosts);
  const sourceImageUrls = galleryImages.map((g) => g.url);

  if (!url) warnings.push("url_inventory.url is empty");

  return {
    retreat: {
      name: decode(title.trim()),
      tagline,
      location,
      dates_start: dates.start,
      dates_end: dates.end,
      dates_text: dates.text,
      retreat_leader,
      pricing_tiers: pricingTiers,
      whats_included: whatsIncluded,
      what_to_expect_html: whatToExpectSection ?? undefined,
      what_to_expect_text: whatToExpectSection ? stripTags(whatToExpectSection) : undefined,
      who_is_this_for_html: whoIsThisForSection ?? undefined,
      who_is_this_for_text: whoIsThisForSection ? stripTags(whoIsThisForSection) : undefined,
      itinerary,
      workshops,
      gallery_images: galleryImages,
      testimonials,
      source_image_urls: sourceImageUrls,
    },
    warnings,
  };
}
