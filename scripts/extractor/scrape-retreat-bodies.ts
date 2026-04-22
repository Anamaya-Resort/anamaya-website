// Scrape the rendered HTML of each v2 retreat page and store the main
// content block. The Elementor Theme Builder injects retreat sections
// (Retreat Dates, Base Rates, Workshops, Teacher Bio, etc.) that the WP
// REST API does NOT return in content.rendered — the only way to get
// them is to render the actual page.

import { sb, resolveSite, chunk } from "./lib";

const CONCURRENCY = 5;
const CONTAINER_START_RE = /<div\s+data-elementor-type="single-post"[^>]*>/i;

type Row = { id: string; url: string; wp_id: number };

function stripHeadAndShell(html: string): string | null {
  // Find the main Elementor "single-post" wrapper. That's the content area
  // injected by Theme Builder; everything before it is site header / nav /
  // breadcrumb, everything after is footer.
  const startMatch = html.match(CONTAINER_START_RE);
  if (!startMatch || startMatch.index === undefined) return null;
  const start = startMatch.index;

  // Walk div open/close from the tag's closing '>' until depth hits 0.
  let i = html.indexOf(">", start) + 1;
  let depth = 1;
  const re = /<(\/?)div\b[^>]*>/gi;
  re.lastIndex = i;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    depth += match[1] === "/" ? -1 : 1;
    if (depth === 0) {
      return html.slice(start, match.index + match[0].length);
    }
  }
  return null;
}

/** Strip <script>, <style>, <template>, <noscript> nodes and nitro lazy attrs. */
function cleanHtml(html: string): string {
  let out = html;
  out = out.replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  out = out.replace(/<(script|style|template|noscript)\b[^>]*\/?>/gi, "");
  out = out.replace(/\snitro-[a-z-]+="[^"]*"/gi, "");
  out = out.replace(/\sdata-nitro[a-z-]*="[^"]*"/gi, "");
  // Collapse runs of whitespace inside tags
  out = out.replace(/\s+>/g, ">");
  return out;
}

async function scrapeOne(url: string): Promise<string | null> {
  const res = await fetch(url, { redirect: "follow" }).catch(() => null);
  if (!res || !res.ok) return null;
  const html = await res.text();
  const container = stripHeadAndShell(html);
  if (!container) return null;
  return cleanHtml(container);
}

async function main() {
  const { label } = resolveSite();
  const client = sb();

  const { data: rows, error } = await client
    .from("url_inventory")
    .select("id, url, wp_id")
    .eq("source_site", label)
    .eq("post_type", "retreat")
    .not("wp_id", "is", null)
    .neq("url", "https://anamayastg.wpenginepowered.com/retreats/")
    .order("id");
  if (error) throw error;
  const retreats = (rows ?? []) as Row[];
  console.log(`→ [${label}] scraping ${retreats.length} retreat pages`);

  let ok = 0;
  let fail = 0;
  const buffer: { url_inventory_id: string; scraped_body_html: string; scraped_at: string }[] = [];

  async function flush() {
    if (buffer.length === 0) return;
    const batch = buffer.splice(0, buffer.length);
    const { error } = await client
      .from("content_items")
      .upsert(batch, { onConflict: "url_inventory_id" });
    if (error) throw new Error(`upsert content_items: ${error.message}`);
  }

  for (const batch of chunk(retreats, CONCURRENCY)) {
    const results = await Promise.all(
      batch.map(async (r) => ({ row: r, html: await scrapeOne(r.url) })),
    );
    for (const { row, html } of results) {
      if (html && html.length > 500) {
        buffer.push({
          url_inventory_id: row.id,
          scraped_body_html: html,
          scraped_at: new Date().toISOString(),
        });
        ok++;
      } else {
        fail++;
      }
    }
    if (buffer.length >= 20) await flush();
    process.stdout.write(`  ${ok + fail}/${retreats.length} (ok=${ok} fail=${fail})\r`);
  }
  await flush();
  console.log(`\n✓ [${label}] scraped ${ok} retreats, ${fail} failed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
