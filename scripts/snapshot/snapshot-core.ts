/**
 * Snapshot core — pure helpers shared by the snapshot pipeline.
 *
 * Canonical home for the asset-extraction / asset-download / HTML-rewrite
 * logic. Extracted verbatim from phase-a-discover.ts (extractAssets),
 * phase-b-download.ts (isTracking / storagePathFor / extractCssRefs /
 * fetch+upload) and phase-c-rewrite.ts (rewriteHtml). The standalone
 * phase scripts keep their own copies (they're done and frozen for the
 * v2 run); new callers — e.g. capture-v1.ts — import from here so there
 * is one implementation going forward.
 */

import { createHash } from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "snapshot";
const STORAGE_PREFIX = "assets";

export type AssetSource =
  | "stylesheet"
  | "script"
  | "image"
  | "image-srcset"
  | "video"
  | "video-poster"
  | "audio"
  | "font-preload"
  | "icon"
  | "inline-style-url";

export type Asset = { url: string; source: AssetSource };

// ---------------------------------------------------------------
// URL resolution (mirror of phase A / C).
// ---------------------------------------------------------------
export function resolveUrl(href: string, base: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("#")
  ) {
    return null;
  }
  try {
    const u = new URL(trimmed, base);
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

function parseSrcset(srcset: string): string[] {
  return srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

// ---------------------------------------------------------------
// Asset extraction (verbatim from phase-a-discover.ts).
// ---------------------------------------------------------------
const IMG_URL_ATTRS = [
  "src",
  "data-src",
  "nitro-lazy-src",
  "data-lazy-src",
  "data-original",
  "data-orig-file",
];
const IMG_SRCSET_ATTRS = [
  "srcset",
  "data-srcset",
  "nitro-lazy-srcset",
  "data-lazy-srcset",
];

export function extractAssets(html: string, pageUrl: string): Asset[] {
  const assets = new Map<string, Asset>();
  const push = (a: Asset) => {
    if (!assets.has(a.url)) assets.set(a.url, a);
  };

  for (const m of html.matchAll(/<link\b([^>]*)>/gi)) {
    const attrs = m[1];
    const rel = (attrs.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] ?? "")
      .toLowerCase()
      .trim();
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const url = resolveUrl(href, pageUrl);
    if (!url) continue;
    let source: AssetSource = "stylesheet";
    if (rel.includes("stylesheet")) source = "stylesheet";
    else if (rel.includes("preload")) source = "font-preload";
    else if (rel.includes("icon")) source = "icon";
    else continue;
    push({ url, source });
  }

  for (const m of html.matchAll(/<script\b([^>]*?)src\s*=\s*["']([^"']+)["']/gi)) {
    const url = resolveUrl(m[2], pageUrl);
    if (url) push({ url, source: "script" });
  }

  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = m[1];
    for (const attr of IMG_URL_ATTRS) {
      const re = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`, "i");
      const v = attrs.match(re)?.[1];
      if (!v) continue;
      const url = resolveUrl(v, pageUrl);
      if (url) push({ url, source: "image" });
    }
    for (const attr of IMG_SRCSET_ATTRS) {
      const re = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`, "i");
      const v = attrs.match(re)?.[1];
      if (!v) continue;
      for (const s of parseSrcset(v)) {
        const url = resolveUrl(s, pageUrl);
        if (url) push({ url, source: "image-srcset" });
      }
    }
  }

  for (const m of html.matchAll(/<source\b([^>]*)>/gi)) {
    const attrs = m[1];
    const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src) {
      const url = resolveUrl(src, pageUrl);
      if (url) push({ url, source: "video" });
    }
    const srcset = attrs.match(/\bsrcset\s*=\s*["']([^"']+)["']/i)?.[1];
    if (srcset) {
      for (const s of parseSrcset(srcset)) {
        const url = resolveUrl(s, pageUrl);
        if (url) push({ url, source: "image-srcset" });
      }
    }
  }

  for (const m of html.matchAll(/<video\b([^>]*)>/gi)) {
    const attrs = m[1];
    const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src) {
      const url = resolveUrl(src, pageUrl);
      if (url) push({ url, source: "video" });
    }
    const poster = attrs.match(/\bposter\s*=\s*["']([^"']+)["']/i)?.[1];
    if (poster) {
      const url = resolveUrl(poster, pageUrl);
      if (url) push({ url, source: "video-poster" });
    }
  }

  for (const m of html.matchAll(/<audio\b([^>]*?)src\s*=\s*["']([^"']+)["']/gi)) {
    const url = resolveUrl(m[2], pageUrl);
    if (url) push({ url, source: "audio" });
  }

  for (const m of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const url = resolveUrl(m[1], pageUrl);
    if (url) push({ url, source: "inline-style-url" });
  }

  return Array.from(assets.values());
}

// ---------------------------------------------------------------
// Asset download helpers (verbatim from phase-b-download.ts).
// ---------------------------------------------------------------
const TRACKING_HOSTS = [
  "facebook.com",
  "facebook.net",
  "google-analytics.com",
  "googletagmanager.com",
  "googleadservices.com",
  "doubleclick.net",
  "bing.com",
  "linkedin.com",
  "pinterest.com",
  "hotjar.com",
  "intercom.io",
  "intercomcdn.com",
  "fullstory.com",
  "mixpanel.com",
  "segment.com",
  "amplitude.com",
  "ads.linkedin.com",
  "px.ads.linkedin.com",
];

export function isTracking(url: string): boolean {
  try {
    const host = new URL(url).host.toLowerCase();
    return TRACKING_HOSTS.some((t) => host === t || host.endsWith("." + t));
  } catch {
    return false;
  }
}

export function urlExtension(url: string): string {
  try {
    const u = new URL(url);
    const pathname = u.pathname;
    const dot = pathname.lastIndexOf(".");
    if (dot < 0 || dot < pathname.lastIndexOf("/")) return "";
    const ext = pathname.slice(dot + 1).toLowerCase();
    if (!/^[a-z0-9]{1,6}$/.test(ext)) return "";
    return ext;
  } catch {
    return "";
  }
}

export function storagePathFor(url: string): string {
  const hash = createHash("sha256").update(url).digest("hex");
  const ext = urlExtension(url);
  return `${STORAGE_PREFIX}/${hash.slice(0, 2)}/${hash}${ext ? "." + ext : ""}`;
}

export function publicStorageUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;
}

export function extractCssRefs(css: string, cssUrl: string): string[] {
  const refs = new Set<string>();
  for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const raw = m[1].trim();
    if (
      !raw ||
      raw.startsWith("data:") ||
      raw.startsWith("#") ||
      raw.startsWith("javascript:")
    ) {
      continue;
    }
    try {
      const u = new URL(raw, cssUrl);
      u.hash = "";
      refs.add(u.toString());
    } catch {
      /* skip */
    }
  }
  for (const m of css.matchAll(/@import\s+(?:url\()?\s*["']([^"']+)["']/gi)) {
    try {
      const u = new URL(m[1], cssUrl);
      u.hash = "";
      refs.add(u.toString());
    } catch {
      /* skip */
    }
  }
  return Array.from(refs);
}

const TIMEOUT_MS = 45_000;
const UA = "anamaya-snapshot/1.0 (+https://anamaya.com migration tool)";

export async function fetchText(
  url: string,
): Promise<{ ok: boolean; status: number; html?: string; error?: string }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
      headers: { "user-agent": UA },
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, status: res.status, html: await res.text() };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchBytes(
  url: string,
): Promise<
  | { ok: true; bytes: Uint8Array; contentType: string }
  | { ok: false; status: number; error: string }
> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
      headers: { "user-agent": UA },
    });
    if (!res.ok) return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    const buf = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    return { ok: true, bytes: buf, contentType };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function uploadAsset(
  client: SupabaseClient,
  storagePath: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await client.storage.from(BUCKET).upload(storagePath, bytes, {
    contentType,
    upsert: true,
    cacheControl: "public, max-age=31536000, immutable",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------
// HTML rewrite (verbatim from phase-c-rewrite.ts).
// `assets` maps original absolute URL → public Storage URL.
// ---------------------------------------------------------------
export type AssetMap = Map<string, string>;

function rewriteOne(
  raw: string,
  pageUrl: string,
  assets: AssetMap,
  counters: { rewritten: number; unmatched: number },
): string {
  const resolved = resolveUrl(raw, pageUrl);
  if (!resolved) return raw;
  const replacement = assets.get(resolved);
  if (!replacement) {
    counters.unmatched++;
    return raw;
  }
  counters.rewritten++;
  return replacement;
}

function rewriteSrcsetValue(
  raw: string,
  pageUrl: string,
  assets: AssetMap,
  counters: { rewritten: number; unmatched: number },
): string {
  return raw
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return part;
      const sp = trimmed.split(/\s+/);
      const url = sp[0];
      const descriptor = sp.slice(1).join(" ");
      const newUrl = rewriteOne(url, pageUrl, assets, counters);
      return descriptor ? `${newUrl} ${descriptor}` : newUrl;
    })
    .join(", ");
}

export function rewriteHtmlAssets(
  html: string,
  pageUrl: string,
  assets: AssetMap,
): { html: string; rewritten: number; unmatched: number } {
  const counters = { rewritten: 0, unmatched: 0 };

  html = html.replace(
    /<link\b([^>]*?)\bhref\s*=\s*(["'])([^"']*)\2/gi,
    (match, before, q, href) =>
      `<link${before}href=${q}${rewriteOne(href, pageUrl, assets, counters)}${q}`,
  );

  html = html.replace(
    /<script\b([^>]*?)\bsrc\s*=\s*(["'])([^"']*)\2/gi,
    (match, before, q, src) =>
      `<script${before}src=${q}${rewriteOne(src, pageUrl, assets, counters)}${q}`,
  );

  html = html.replace(/<img\b([^>]*)>/gi, (match, rawAttrs) => {
    let next = rawAttrs as string;
    const attrBoundary = (attr: string) =>
      `(?<![\\w-])${attr}\\s*=\\s*(["'])([^"']*)\\1`;

    for (const attr of IMG_URL_ATTRS) {
      const re = new RegExp(attrBoundary(attr), "gi");
      next = next.replace(
        re,
        (m, q, v) => `${attr}=${q}${rewriteOne(v, pageUrl, assets, counters)}${q}`,
      );
    }
    for (const attr of IMG_SRCSET_ATTRS) {
      const re = new RegExp(attrBoundary(attr), "gi");
      next = next.replace(
        re,
        (m, q, v) =>
          `${attr}=${q}${rewriteSrcsetValue(v, pageUrl, assets, counters)}${q}`,
      );
    }

    const lazySrc = next.match(
      /(?<![\w-])(?:nitro-lazy-src|data-lazy-src|data-original|data-orig-file)\s*=\s*(["'])([^"']+)\1/i,
    )?.[2];
    const lazySrcset = next.match(
      /(?<![\w-])(?:nitro-lazy-srcset|data-lazy-srcset)\s*=\s*(["'])([^"']+)\1/i,
    )?.[2];
    const srcVal = next.match(/(?<![\w-])src\s*=\s*(["'])([^"']*)\1/i)?.[2];
    const isPlaceholder = !!srcVal && srcVal.startsWith("data:");
    const wasPromoted = !!lazySrc && (!srcVal || isPlaceholder);
    if (wasPromoted && lazySrc) {
      if (srcVal !== undefined) {
        next = next.replace(
          /(?<![\w-])src\s*=\s*(["'])[^"']*\1/i,
          (m, q) => `src=${q}${lazySrc}${q}`,
        );
      } else {
        next = `${next.trimEnd()} src="${lazySrc}"`;
      }
    }
    if (lazySrcset) {
      const hadSrcset = /(?<![\w-])srcset\s*=/i.test(next);
      if (hadSrcset) {
        next = next.replace(
          /(?<![\w-])srcset\s*=\s*(["'])[^"']*\1/i,
          (m, q) => `srcset=${q}${lazySrcset}${q}`,
        );
      } else {
        next = `${next.trimEnd()} srcset="${lazySrcset}"`;
      }
    }

    if (wasPromoted || lazySrcset) {
      next = next.replace(
        /(?<![\w-])class\s*=\s*(["'])([^"']*)\1/i,
        (m, q, classes: string) => {
          const cleaned = classes
            .split(/\s+/)
            .filter(
              (cls) =>
                cls &&
                cls !== "nitro-lazy" &&
                cls !== "nitro-lazy-empty" &&
                cls !== "lazyload" &&
                cls !== "lazy",
            )
            .join(" ");
          return `class=${q}${cleaned}${q}`;
        },
      );
      next = next.replace(/(?<![\w-])nitro-lazy-empty\b(?!=)/gi, "");
      next = next.replace(
        /(?<![\w-])data-nitro-empty-id\s*=\s*(["'])[^"']*\1/gi,
        "",
      );
      next = next.replace(
        /(?<![\w-])(?:nitro-lazy-src|nitro-lazy-srcset|data-lazy-src|data-lazy-srcset)\s*=\s*(["'])[^"']*\1/gi,
        "",
      );
    }

    return `<img${next}>`;
  });

  html = html.replace(/<source\b([^>]*)>/gi, (match, attrs) => {
    let next = attrs as string;
    next = next.replace(
      /\bsrc\s*=\s*(["'])([^"']*)\1/gi,
      (m, q, v) => `src=${q}${rewriteOne(v, pageUrl, assets, counters)}${q}`,
    );
    next = next.replace(
      /\bsrcset\s*=\s*(["'])([^"']*)\1/gi,
      (m, q, v) => `srcset=${q}${rewriteSrcsetValue(v, pageUrl, assets, counters)}${q}`,
    );
    return `<source${next}>`;
  });

  html = html.replace(/<video\b([^>]*)>/gi, (match, attrs) => {
    let next = attrs as string;
    next = next.replace(
      /\bsrc\s*=\s*(["'])([^"']*)\1/gi,
      (m, q, v) => `src=${q}${rewriteOne(v, pageUrl, assets, counters)}${q}`,
    );
    next = next.replace(
      /\bposter\s*=\s*(["'])([^"']*)\1/gi,
      (m, q, v) => `poster=${q}${rewriteOne(v, pageUrl, assets, counters)}${q}`,
    );
    return `<video${next}>`;
  });

  html = html.replace(
    /<audio\b([^>]*?)\bsrc\s*=\s*(["'])([^"']*)\2/gi,
    (match, before, q, src) =>
      `<audio${before}src=${q}${rewriteOne(src, pageUrl, assets, counters)}${q}`,
  );

  html = html.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, q, raw) => {
    const next = rewriteOne(raw, pageUrl, assets, counters);
    return `url(${q}${next}${q})`;
  });

  return { html, rewritten: counters.rewritten, unmatched: counters.unmatched };
}
