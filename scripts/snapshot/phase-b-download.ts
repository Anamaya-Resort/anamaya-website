/**
 * Snapshot Phase B — Asset download.
 *
 * Reads migration/snapshot/inventory.json (produced by Phase A),
 * downloads each unique asset to a public Supabase Storage bucket,
 * and writes asset-storage.json mapping the original URL → the
 * Storage path so Phase C can rewrite the HTML.
 *
 * For CSS files we also parse the downloaded content for nested
 * `url(...)` and `@import` references and feed those back into the
 * queue — Elementor stylesheets reference fonts, background images,
 * and child stylesheets that the HTML never mentions directly.
 *
 * Tracking pixels (Facebook, GA, LinkedIn, etc.) are skipped — they
 * call out to third-party servers regardless and don't help anyone
 * if mirrored. All other externals (Google Fonts, jQuery CDN, etc.)
 * are downloaded so the snapshot is truly standalone.
 *
 * Resumable: a URL already present in asset-storage.json is skipped.
 *
 * Run: npm run snapshot:download
 */

import { createHash } from "crypto";
import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { sb } from "../extractor/lib";

const BUCKET = "snapshot";
const STORAGE_PREFIX = "assets";

const OUT_DIR = resolve(process.cwd(), "migration/snapshot");
const MANIFEST_PATH = resolve(OUT_DIR, "asset-storage.json");
const ERRORS_PATH = resolve(OUT_DIR, "asset-errors.json");

// Per-host concurrency. Staging WP is the slowest link; CDNs handle
// more. We round-robin by host so a single CDN can't starve out the
// staging host (and vice versa).
const CONCURRENCY = 10;
const TIMEOUT_MS = 45_000;

// Hosts whose responses are tracking beacons and have no value as
// archival assets. Match by host substring.
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

type InventoryAsset = {
  url: string;
  sources: string[];
  ref_count: number;
  internal: boolean;
  sample_pages: string[];
};

type Inventory = {
  generated_at: string;
  source_site: string;
  base_url: string;
  total_unique_assets: number;
  internal_count: number;
  external_count: number;
  assets: InventoryAsset[];
};

type StorageRecord = {
  url: string;
  storage_path: string;
  bytes: number;
  content_type: string;
  internal: boolean;
  // 'inventory' = came from Phase A's HTML scan;
  // 'css-recurse' = discovered while parsing a downloaded CSS file.
  origin: "inventory" | "css-recurse";
  downloaded_at: string;
};

type ErrorRecord = {
  url: string;
  http_status?: number;
  error: string;
  attempted_at: string;
};

type Manifest = Record<string, StorageRecord>;
type ErrorMap = Record<string, ErrorRecord>;

// ---------------------------------------------------------------
function isTracking(url: string): boolean {
  try {
    const host = new URL(url).host.toLowerCase();
    return TRACKING_HOSTS.some((t) => host === t || host.endsWith("." + t));
  } catch {
    return false;
  }
}

function urlExtension(url: string): string {
  try {
    const u = new URL(url);
    const pathname = u.pathname;
    const dot = pathname.lastIndexOf(".");
    if (dot < 0 || dot < pathname.lastIndexOf("/")) return "";
    const ext = pathname.slice(dot + 1).toLowerCase();
    // Sanity: extensions are short alphanumerics.
    if (!/^[a-z0-9]{1,6}$/.test(ext)) return "";
    return ext;
  } catch {
    return "";
  }
}

function storagePathFor(url: string): string {
  const hash = createHash("sha256").update(url).digest("hex");
  const ext = urlExtension(url);
  // Two-char shard so the bucket isn't one giant flat directory.
  return `${STORAGE_PREFIX}/${hash.slice(0, 2)}/${hash}${ext ? "." + ext : ""}`;
}

function publicUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;
}

// ---------------------------------------------------------------
async function ensureBucket(): Promise<void> {
  const c = sb();
  const { data: buckets } = await c.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (exists) return;
  // Don't pass fileSizeLimit — let it inherit the project default.
  // Supabase rejects per-bucket caps higher than the project ceiling.
  const { error } = await c.storage.createBucket(BUCKET, { public: true });
  if (error) throw new Error(`createBucket: ${error.message}`);
  console.log(`  created bucket "${BUCKET}" (public)`);
}

// ---------------------------------------------------------------
async function loadJsonOr<T>(path: string, fallback: T): Promise<T> {
  if (!existsSync(path)) return fallback;
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function saveManifest(m: Manifest): Promise<void> {
  await writeFile(MANIFEST_PATH, JSON.stringify(m, null, 2), "utf8");
}

async function saveErrors(e: ErrorMap): Promise<void> {
  await writeFile(ERRORS_PATH, JSON.stringify(e, null, 2), "utf8");
}

// ---------------------------------------------------------------
// Parse a CSS file for url(...) and @import references, resolved
// against the CSS file's own URL.
// ---------------------------------------------------------------
function extractCssRefs(css: string, cssUrl: string): string[] {
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

// ---------------------------------------------------------------
async function fetchAsset(
  url: string,
): Promise<
  | { ok: true; bytes: Uint8Array; contentType: string }
  | { ok: false; status: number; error: string }
> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
      headers: {
        "user-agent":
          "anamaya-snapshot/1.0 (+https://anamaya.com migration tool)",
      },
    });
    if (!res.ok) return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    const buf = new Uint8Array(await res.arrayBuffer());
    const contentType =
      res.headers.get("content-type") ?? "application/octet-stream";
    return { ok: true, bytes: buf, contentType };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ---------------------------------------------------------------
async function uploadAsset(
  client: ReturnType<typeof sb>,
  storagePath: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await client.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType,
      upsert: true,
      cacheControl: "public, max-age=31536000, immutable",
    });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------
type QueueItem = { url: string; origin: StorageRecord["origin"] };

async function processOne(
  client: ReturnType<typeof sb>,
  item: QueueItem,
  manifest: Manifest,
  errors: ErrorMap,
  cssQueue: QueueItem[],
): Promise<{ status: "ok" | "skipped" | "tracking" | "error" }> {
  const { url, origin } = item;
  if (manifest[url]) return { status: "skipped" };
  if (isTracking(url)) return { status: "tracking" };

  const fetched = await fetchAsset(url);
  if (!fetched.ok) {
    errors[url] = {
      url,
      http_status: fetched.status,
      error: fetched.error,
      attempted_at: new Date().toISOString(),
    };
    return { status: "error" };
  }

  const storagePath = storagePathFor(url);
  const upload = await uploadAsset(
    client,
    storagePath,
    fetched.bytes,
    fetched.contentType,
  );
  if (!upload.ok) {
    errors[url] = {
      url,
      error: `upload: ${upload.error}`,
      attempted_at: new Date().toISOString(),
    };
    return { status: "error" };
  }

  let internal = false;
  try {
    internal = new URL(url).host.endsWith("anamayastg.wpenginepowered.com");
  } catch {
    /* leave false */
  }

  manifest[url] = {
    url,
    storage_path: storagePath,
    bytes: fetched.bytes.length,
    content_type: fetched.contentType,
    internal,
    origin,
    downloaded_at: new Date().toISOString(),
  };

  // If this is a CSS file, parse for nested url() and @import refs
  // and queue them up. Use the URL as-fetched (after redirect) for
  // resolving relatives — falls back to the requested URL since we
  // don't have the final URL exposed by fetch().
  if (
    fetched.contentType.includes("text/css") ||
    urlExtension(url) === "css"
  ) {
    const css = new TextDecoder("utf-8").decode(fetched.bytes);
    for (const ref of extractCssRefs(css, url)) {
      if (!manifest[ref] && !errors[ref]) {
        cssQueue.push({ url: ref, origin: "css-recurse" });
      }
    }
  }

  return { status: "ok" };
}

async function runConcurrent(
  client: ReturnType<typeof sb>,
  initialQueue: QueueItem[],
  manifest: Manifest,
  errors: ErrorMap,
): Promise<{
  ok: number;
  skipped: number;
  tracking: number;
  errors: number;
  cssRecursed: number;
}> {
  const queue = [...initialQueue];
  const cssQueue: QueueItem[] = [];
  let ok = 0;
  let skipped = 0;
  let tracking = 0;
  let errCount = 0;
  let cssRecursed = 0;
  const startCount = queue.length;
  let done = 0;

  // Persist progress every N successful downloads so a crash mid-run
  // doesn't lose all the upload work.
  const SAVE_EVERY = 100;
  let untilSave = SAVE_EVERY;

  // Drain the main queue, then drain everything CSS-recursion adds,
  // and keep going until both are empty (a CSS file's CSS file's CSS
  // file should still be picked up).
  while (queue.length > 0 || cssQueue.length > 0) {
    const batch: QueueItem[] = [];
    while (batch.length < CONCURRENCY && queue.length > 0) {
      batch.push(queue.shift()!);
    }
    while (batch.length < CONCURRENCY && cssQueue.length > 0) {
      const item = cssQueue.shift()!;
      cssRecursed++;
      batch.push(item);
    }
    if (batch.length === 0) break;

    const results = await Promise.all(
      batch.map((item) =>
        processOne(client, item, manifest, errors, cssQueue),
      ),
    );

    for (let i = 0; i < results.length; i++) {
      done++;
      const r = results[i];
      const item = batch[i];
      if (r.status === "ok") ok++;
      else if (r.status === "skipped") skipped++;
      else if (r.status === "tracking") tracking++;
      else errCount++;
      const tag =
        r.status === "ok"
          ? "✓"
          : r.status === "skipped"
            ? "·"
            : r.status === "tracking"
              ? "T"
              : "✗";
      const totalEst = startCount + cssRecursed;
      console.log(
        `  ${tag} [${String(done).padStart(5)}/${String(totalEst).padStart(5)}] ${item.url.slice(0, 130)}`,
      );

      if (--untilSave <= 0) {
        await saveManifest(manifest);
        await saveErrors(errors);
        untilSave = SAVE_EVERY;
      }
    }
  }

  await saveManifest(manifest);
  await saveErrors(errors);
  return { ok, skipped, tracking, errors: errCount, cssRecursed };
}

// ---------------------------------------------------------------
async function main() {
  console.log("Snapshot Phase B — Asset download");
  console.log(`Bucket: ${BUCKET}`);
  await mkdir(OUT_DIR, { recursive: true });

  const inv = (await loadJsonOr<Inventory | null>(
    resolve(OUT_DIR, "inventory.json"),
    null,
  )) as Inventory | null;
  if (!inv) {
    console.error("inventory.json not found — run snapshot:discover first");
    process.exit(1);
  }
  console.log(`→ inventory: ${inv.total_unique_assets} assets`);

  await ensureBucket();

  const manifest = await loadJsonOr<Manifest>(MANIFEST_PATH, {});
  const errors = await loadJsonOr<ErrorMap>(ERRORS_PATH, {});
  console.log(
    `→ manifest: ${Object.keys(manifest).length} previously downloaded · ${Object.keys(errors).length} previous errors (will be retried)`,
  );

  // Clear prior errors so they're retried this pass. Successful
  // downloads stay cached.
  for (const k of Object.keys(errors)) delete errors[k];

  const initialQueue: QueueItem[] = inv.assets.map((a) => ({
    url: a.url,
    origin: "inventory",
  }));

  const client = sb();
  const t0 = Date.now();
  const stats = await runConcurrent(client, initialQueue, manifest, errors);
  const elapsed = Math.round((Date.now() - t0) / 1000);

  const totalBytes = Object.values(manifest).reduce((a, b) => a + b.bytes, 0);
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  console.log(
    `\n→ done in ${elapsed}s — ${stats.ok} new, ${stats.skipped} cached, ${stats.tracking} tracking-skipped, ${stats.errors} errors, ${stats.cssRecursed} discovered via CSS`,
  );
  console.log(
    `→ total in storage: ${Object.keys(manifest).length} assets, ${(totalBytes / 1024 / 1024).toFixed(1)} MB`,
  );
  console.log(`→ public URL prefix: ${publicUrl(supabaseUrl, "")}`);

  if (stats.errors > 0) {
    console.log(
      `\n→ ${stats.errors} errors written to asset-errors.json — re-run to retry`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
