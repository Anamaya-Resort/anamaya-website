import "server-only";
import { createHash } from "crypto";
import sharp from "sharp";
import { aoSupabaseAdmin } from "@/lib/ao-supabase";
import { supabaseServer } from "@/lib/supabase-server";

export type ImageBucket = "retreat-media" | "retreat-leader-photos" | "general-media";

export type ImportedImage = {
  source_url: string;
  ao_bucket: ImageBucket;
  ao_path: string;
  ao_public_url: string;
  width: number | null;
  height: number | null;
  reused: boolean;
};

export type SkippedImage = {
  source_url: string;
  reason: "denylist" | "fetch_failed" | "decode_failed" | "upload_failed";
  detail?: string;
};

export type ImportImageResult =
  | { ok: true; image: ImportedImage }
  | { ok: false; skipped: SkippedImage };

let denylistCache: { patterns: string[]; loadedAt: number } | null = null;
const DENYLIST_TTL_MS = 60_000;

async function loadDenylist(): Promise<string[]> {
  if (denylistCache && Date.now() - denylistCache.loadedAt < DENYLIST_TTL_MS) {
    return denylistCache.patterns;
  }
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("image_import_denylist")
    .select("pattern");
  if (error) throw new Error(`load denylist: ${error.message}`);
  const patterns = (data ?? []).map((r) => r.pattern);
  denylistCache = { patterns, loadedAt: Date.now() };
  return patterns;
}

function isDecorative(url: string, patterns: string[]): string | null {
  for (const p of patterns) {
    if (p && url.includes(p)) return p;
  }
  return null;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function extFromMime(mime: string | undefined): string {
  switch (mime) {
    case "image/webp": return "webp";
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/gif": return "gif";
    case "image/avif": return "avif";
    default: return "bin";
  }
}

function basenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() ?? "image";
    return last.replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() || "image";
  } catch {
    return "image";
  }
}

/**
 * Import a single image into AnamayOS Storage. Idempotent via sha256:
 * if the same bytes were already uploaded, reuses the existing row.
 *
 * `pathPrefix` shapes the storage key: `${pathPrefix}/${basename}-${sha8}.${ext}`.
 * Pass e.g. `${retreat_id}/gallery` so all gallery images for a retreat
 * land in one folder.
 */
export async function importImage(opts: {
  sourceUrl: string;
  bucket: ImageBucket;
  pathPrefix: string;
  altText?: string;
}): Promise<ImportImageResult> {
  const { sourceUrl, bucket, pathPrefix, altText } = opts;
  const ao = aoSupabaseAdmin();
  const sb = supabaseServer();

  const denylist = await loadDenylist();
  const matched = isDecorative(sourceUrl, denylist);
  if (matched) {
    await sb.from("image_imports").insert({
      source_url: sourceUrl,
      source_hash: sha256Hex(new TextEncoder().encode(`denylist:${sourceUrl}`)),
      ao_bucket: bucket,
      ao_path: "",
      ao_public_url: "",
      status: "skipped_denylist",
      failure_reason: `Matched denylist pattern: ${matched}`,
    });
    return { ok: false, skipped: { source_url: sourceUrl, reason: "denylist", detail: matched } };
  }

  let res: Response;
  try {
    res = await fetch(sourceUrl, { redirect: "follow" });
  } catch (e) {
    return { ok: false, skipped: { source_url: sourceUrl, reason: "fetch_failed", detail: String(e) } };
  }
  if (!res.ok) {
    return { ok: false, skipped: { source_url: sourceUrl, reason: "fetch_failed", detail: `HTTP ${res.status}` } };
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const hash = sha256Hex(bytes);

  const existing = await sb
    .from("image_imports")
    .select("source_url, ao_bucket, ao_path, ao_public_url, width, height, status")
    .eq("source_hash", hash)
    .maybeSingle();
  if (existing.data && existing.data.status === "uploaded") {
    return {
      ok: true,
      image: {
        source_url: existing.data.source_url,
        ao_bucket: existing.data.ao_bucket as ImageBucket,
        ao_path: existing.data.ao_path,
        ao_public_url: existing.data.ao_public_url,
        width: existing.data.width,
        height: existing.data.height,
        reused: true,
      },
    };
  }

  let meta: sharp.Metadata;
  try {
    meta = await sharp(bytes).metadata();
  } catch (e) {
    return { ok: false, skipped: { source_url: sourceUrl, reason: "decode_failed", detail: String(e) } };
  }
  const width = meta.width ?? null;
  const height = meta.height ?? null;
  const mime = meta.format ? `image/${meta.format === "jpeg" ? "jpeg" : meta.format}` : "application/octet-stream";
  const ext = extFromMime(mime);
  const sha8 = hash.slice(0, 8);
  const key = `${pathPrefix.replace(/^\/+|\/+$/g, "")}/${basenameFromUrl(sourceUrl)}-${sha8}.${ext}`;

  const upload = await ao.storage.from(bucket).upload(key, bytes, {
    contentType: mime,
    upsert: false,
  });
  if (upload.error && !/already exists|duplicate/i.test(upload.error.message)) {
    return { ok: false, skipped: { source_url: sourceUrl, reason: "upload_failed", detail: upload.error.message } };
  }
  const { data: pub } = ao.storage.from(bucket).getPublicUrl(key);
  const publicUrl = pub.publicUrl;

  await sb.from("image_imports").upsert(
    {
      source_url: sourceUrl,
      source_hash: hash,
      ao_bucket: bucket,
      ao_path: key,
      ao_public_url: publicUrl,
      width,
      height,
      file_size: bytes.byteLength,
      mime_type: mime,
      alt_text: altText ?? null,
      status: "uploaded",
      failure_reason: null,
    },
    { onConflict: "source_hash" },
  );

  return {
    ok: true,
    image: {
      source_url: sourceUrl,
      ao_bucket: bucket,
      ao_path: key,
      ao_public_url: publicUrl,
      width,
      height,
      reused: false,
    },
  };
}

/** Import many images in series. Series, not parallel, to be polite to WP origin. */
export async function importImages(items: Parameters<typeof importImage>[0][]): Promise<ImportImageResult[]> {
  const out: ImportImageResult[] = [];
  for (const it of items) {
    out.push(await importImage(it));
  }
  return out;
}
