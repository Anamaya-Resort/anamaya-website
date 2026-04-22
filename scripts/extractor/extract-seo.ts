// Extract SEO metadata by scraping the rendered HTML <head> of each URL.
// Works for any SEO plugin (Yoast, Rank Math, etc.) because they all emit
// standard <meta>, <link rel="canonical">, and <script type="application/ld+json"> tags.
//
// Run: SITE=v2 npm run extract:seo

import { sb, resolveSite, chunk } from "./lib";

const CONCURRENCY = 10;

type Row = {
  id: string;
  url: string;
};

type SeoParsed = {
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_type: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  robots: { raw: string } | null;
  schema_ld: unknown | null;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8217;/g, "’");
}

function parseHead(html: string): SeoParsed {
  // Only look at the <head> section for speed (everything we want is in there)
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const head = headMatch ? headMatch[1] : html;

  const getAttr = (tag: string, key: "name" | "property", value: string, attr = "content") => {
    const re = new RegExp(
      `<${tag}[^>]*?\\b${key}\\s*=\\s*["']${value}["'][^>]*?\\b${attr}\\s*=\\s*["']([^"']*)["']`,
      "i",
    );
    const m = head.match(re);
    if (m) return decodeEntities(m[1]);
    const reRev = new RegExp(
      `<${tag}[^>]*?\\b${attr}\\s*=\\s*["']([^"']*)["'][^>]*?\\b${key}\\s*=\\s*["']${value}["']`,
      "i",
    );
    const m2 = head.match(reRev);
    return m2 ? decodeEntities(m2[1]) : null;
  };

  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1].trim()) : null;

  const canonicalMatch = head.match(
    /<link[^>]*?\brel\s*=\s*["']canonical["'][^>]*?\bhref\s*=\s*["']([^"']*)["']/i,
  );
  const canonical = canonicalMatch
    ? decodeEntities(canonicalMatch[1])
    : (head.match(/<link[^>]*?\bhref\s*=\s*["']([^"']*)["'][^>]*?\brel\s*=\s*["']canonical["']/i)
        ?.[1] ?? null);

  const robotsRaw = getAttr("meta", "name", "robots");

  // schema.org JSON-LD: can be multiple <script type="application/ld+json"> blocks.
  // Merge all into an array; callers can process.
  const ldRe = /<script[^>]*?type\s*=\s*["']application\/ld\+json["'][^>]*?>([\s\S]*?)<\/script>/gi;
  const schemas: unknown[] = [];
  let m: RegExpExecArray | null;
  while ((m = ldRe.exec(head)) !== null) {
    try {
      schemas.push(JSON.parse(m[1].trim()));
    } catch {
      // ignore malformed JSON-LD
    }
  }

  return {
    meta_title: title,
    meta_description: getAttr("meta", "name", "description"),
    canonical_url: canonical,
    og_title: getAttr("meta", "property", "og:title"),
    og_description: getAttr("meta", "property", "og:description"),
    og_image: getAttr("meta", "property", "og:image"),
    og_type: getAttr("meta", "property", "og:type"),
    twitter_title: getAttr("meta", "name", "twitter:title"),
    twitter_description: getAttr("meta", "name", "twitter:description"),
    twitter_image: getAttr("meta", "name", "twitter:image"),
    robots: robotsRaw ? { raw: robotsRaw } : null,
    schema_ld: schemas.length === 0 ? null : schemas.length === 1 ? schemas[0] : schemas,
  };
}

async function scrapeOne(row: Row): Promise<SeoParsed | null> {
  const res = await fetch(row.url, { redirect: "follow" }).catch(() => null);
  if (!res || !res.ok) return null;
  const html = await res.text();
  return parseHead(html);
}

async function main() {
  const { label } = resolveSite();
  const client = sb();

  // Pull url_inventory rows that have a corresponding content_items row and are content-kind
  console.log(`→ [${label}] fetching target URLs`);
  const rows: Row[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await client
      .from("url_inventory")
      .select("id, url")
      .eq("source_site", label)
      .eq("url_kind", "content")
      .neq("post_type", "attachment")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`→ ${rows.length} pages to scan`);

  let done = 0;
  let ok = 0;
  let fail = 0;
  const seoRows: any[] = [];

  const flush = async () => {
    if (seoRows.length === 0) return;
    const batch = seoRows.splice(0, seoRows.length);
    const { error } = await client
      .from("seo_meta")
      .upsert(batch, { onConflict: "url_inventory_id" });
    if (error) throw new Error(`upsert seo_meta: ${error.message}`);
  };

  for (const batch of chunk(rows, CONCURRENCY)) {
    const results = await Promise.all(
      batch.map(async (r) => ({ row: r, seo: await scrapeOne(r) })),
    );
    for (const { row, seo } of results) {
      done++;
      if (!seo) {
        fail++;
        continue;
      }
      ok++;
      seoRows.push({
        url_inventory_id: row.id,
        ...seo,
      });
    }
    if (seoRows.length >= 50) await flush();
    if (done % 100 < CONCURRENCY) {
      process.stdout.write(`  ${done}/${rows.length}  (ok=${ok} fail=${fail})\r`);
    }
  }
  await flush();

  console.log(`\n✓ [${label}] ${ok} SEO rows upserted, ${fail} failed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
