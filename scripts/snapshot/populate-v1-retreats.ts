/**
 * Populate v1 retreat structured data for the React retreat template.
 *
 * The 32 retreats where production (v1) is newer or v1-only can't render
 * through the React template until they have body + featured image +
 * excerpt + SEO in the structured tables (the template reads those, not
 * the frozen snapshot). capture-v1.ts already wrote the rewritten
 * frozen_html (asset URLs → Supabase Storage) for these rows, so we
 * extract everything from THAT — no separate media mapping needed.
 *
 * For each v1 retreat winner:
 *   - body  → content_items.scraped_body_html (Elementor single-post
 *             container, Storage URLs already baked in)
 *   - excerpt → content_items.excerpt_rendered (meta description)
 *   - seo   → seo_meta (title / description / og_image / canonical),
 *             where og_image is the featured image the data layer uses
 *             as the hero for the v1 branch.
 *
 * Run after snapshot:capture-v1. Idempotent.
 * Run: npm run snapshot:populate-v1-retreats
 */

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";
import { sb } from "../extractor/lib";
import { publicStorageUrl } from "./snapshot-core";

const DIFF_PATH = resolve(process.cwd(), "migration/content-diff.json");
const MANIFEST_PATH = resolve(process.cwd(), "migration/snapshot-v1/asset-storage.json");
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";

// Mirror of scrape-retreat-bodies.ts: isolate the Elementor single-post
// container (the retreat body Theme Builder injects — dates, rates,
// workshops, bio) and drop script/style/lazy cruft.
const CONTAINER_START_RE = /<div\s+data-elementor-type="single(?:-post)?"[^>]*>/i;

function stripHeadAndShell(html: string): string | null {
  const startMatch = html.match(CONTAINER_START_RE);
  if (!startMatch || startMatch.index === undefined) return null;
  const start = startMatch.index;
  let depth = 1;
  const re = /<(\/?)div\b[^>]*>/gi;
  re.lastIndex = html.indexOf(">", start) + 1;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    depth += match[1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, match.index + match[0].length);
  }
  return null;
}

function cleanHtml(html: string): string {
  let out = html;
  out = out.replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  out = out.replace(/<(script|style|template|noscript)\b[^>]*\/?>/gi, "");
  out = out.replace(/\snitro-[a-z-]+="[^"]*"/gi, "");
  out = out.replace(/\sdata-nitro[a-z-]*="[^"]*"/gi, "");
  out = out.replace(/\s+>/g, ">");
  return out;
}

function metaContent(html: string, key: string, attr: "property" | "name"): string | null {
  const re = new RegExp(
    `<meta\\b[^>]*\\b${attr}\\s*=\\s*["']${key}["'][^>]*>`,
    "i",
  );
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  return tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] ?? null;
}

function pageTitle(html: string): string | null {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;
}

function firstBodyImg(bodyHtml: string): string | null {
  // Already-rewritten Storage URL is preferred (capture rewrote <img src>).
  return bodyHtml.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
}

type DiffRow = { url_path: string; post_type: string | null; newer_side?: string };
type DiffFile = { diffs: DiffRow[]; v1_only: DiffRow[] };
type RetreatRow = { id: string; url: string; url_path: string; title: string | null };

async function main() {
  console.log("Populate v1 retreat structured data");
  const diff = JSON.parse(await readFile(DIFF_PATH, "utf8")) as DiffFile;
  const paths = new Set<string>();
  for (const d of diff.diffs) {
    if (d.newer_side === "v1" && d.post_type === "retreat") paths.add(d.url_path.replace(/\/$/, ""));
  }
  for (const r of diff.v1_only) {
    if (r.post_type === "retreat") paths.add(r.url_path.replace(/\/$/, ""));
  }
  console.log(`→ ${paths.size} retreat winner paths`);

  // Asset manifest maps original anamaya.com URLs → Storage paths, so we
  // can resolve the og:image (a <meta>, which capture did NOT rewrite)
  // to its Storage copy.
  const manifest: Record<string, { storage_path: string }> = existsSync(MANIFEST_PATH)
    ? JSON.parse(await readFile(MANIFEST_PATH, "utf8"))
    : {};
  const toStorage = (origUrl: string | null): string | null => {
    if (!origUrl) return null;
    const rec = manifest[origUrl];
    return rec ? publicStorageUrl(SUPABASE_URL, rec.storage_path) : null;
  };

  const c = sb();
  // Resolve v1 retreat rows for these paths.
  const { data: rows } = await c
    .from("url_inventory")
    .select("id, url, url_path, title")
    .eq("source_site", "v1")
    .eq("post_type", "retreat");
  const byPath = new Map<string, RetreatRow>();
  for (const r of (rows ?? []) as RetreatRow[]) byPath.set(r.url_path.replace(/\/$/, ""), r);

  let ok = 0;
  let noFrozen = 0;
  let noBody = 0;
  for (const p of paths) {
    const row = byPath.get(p);
    if (!row) {
      console.log(`  ⚠ no v1 retreat row for ${p}`);
      continue;
    }
    const { data: ci } = await c
      .from("content_items")
      .select("frozen_html")
      .eq("url_inventory_id", row.id)
      .maybeSingle();
    if (!ci?.frozen_html) {
      noFrozen++;
      console.log(`  ⚠ no frozen_html for ${p} (run capture-v1 first)`);
      continue;
    }
    const frozen = ci.frozen_html as string;
    const container = stripHeadAndShell(frozen);
    if (!container || container.length < 500) {
      noBody++;
      console.log(`  ⚠ could not isolate body for ${p}`);
      continue;
    }
    const body = cleanHtml(container);

    const metaDesc =
      metaContent(frozen, "description", "name") ||
      metaContent(frozen, "og:description", "property");
    const ogImageOrig =
      metaContent(frozen, "og:image", "property");
    const ogImage = toStorage(ogImageOrig) || firstBodyImg(body);
    const title = metaContent(frozen, "og:title", "property") || pageTitle(frozen) || row.title;
    const canonical = row.url as string;

    const { error: ciErr } = await c.from("content_items").upsert(
      {
        url_inventory_id: row.id,
        scraped_body_html: body,
        excerpt_rendered: metaDesc ?? null,
        scraped_at: new Date().toISOString(),
      },
      { onConflict: "url_inventory_id" },
    );
    const { error: seoErr } = await c.from("seo_meta").upsert(
      {
        url_inventory_id: row.id,
        meta_title: title ?? null,
        meta_description: metaDesc ?? null,
        og_image: ogImage ?? null,
        canonical_url: canonical,
      },
      { onConflict: "url_inventory_id" },
    );
    if (ciErr || seoErr) {
      console.log(`  ✗ ${p} — ${ciErr?.message ?? ""} ${seoErr?.message ?? ""}`);
      continue;
    }
    ok++;
    console.log(`  ✓ ${p} — body ${body.length}b, img ${ogImage ? "yes" : "NONE"}`);
  }
  console.log(`\nDone. ${ok} populated, ${noFrozen} missing frozen_html, ${noBody} body-extract failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
