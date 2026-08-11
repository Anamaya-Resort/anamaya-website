"use server";

import "server-only";
import sharp from "sharp";
import { supabaseServer } from "@/lib/supabase-server";

// Same storage bucket the block editors upload into (see
// src/app/admin/(default)/blocks/actions.ts). Wizard media lives under a
// `wizard/` prefix so it's easy to tell apart from block uploads.
const BUCKET = "images";

// Generous cap — videos can be large, but this keeps a single paste/upload
// from ballooning storage. Mirrors the 100 MB hero-video ceiling.
const MAX_BYTES = 100 * 1024 * 1024;

/** Lowercase, keep the extension, strip anything not [a-z0-9._-]. */
function safeFileName(raw: string): string {
  const name = (raw || "file").toLowerCase().trim();
  const cleaned = name
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  return cleaned || "file";
}

/** Replace the trailing extension (if any) with `.webp`. */
function toWebpKey(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "") + ".webp";
}

/**
 * Upload a single image or video for the Add-New-Post wizard.
 *
 * Raster images (PNG/JPG/WebP/…) are converted to WebP (quality 82) so
 * stored media stays small and consistent. SVGs and videos are stored
 * as-is (no transcoding) so vector art and moving footage round-trip
 * unchanged. Returns the public URL and a coarse `kind` from the MIME type.
 *
 * Server action that RETURNS a value, so it's callable straight from the
 * wizard client component.
 */
export async function uploadWizardMedia(
  formData: FormData,
): Promise<{ url: string; kind: "image" | "video" }> {
  const file = formData.get("file") as File | null;
  if (!file || typeof file === "string") throw new Error("No file provided");
  if (file.size > MAX_BYTES) throw new Error("File too large (max 100 MB)");

  const mime = file.type || "";
  const isVideo = mime.startsWith("video/");
  const isImage = mime.startsWith("image/");
  // Convert raster images to WebP; leave SVG (vector) and video untouched.
  const convertToWebp = isImage && mime !== "image/svg+xml";
  const kind: "image" | "video" = isVideo ? "video" : "image";

  const bytes = Buffer.from(await file.arrayBuffer());

  let outBytes: Buffer = bytes;
  let contentType = mime || "application/octet-stream";
  let key = `wizard/${Date.now()}-${safeFileName(file.name)}`;

  if (convertToWebp) {
    outBytes = await sharp(bytes).webp({ quality: 82 }).toBuffer();
    contentType = "image/webp";
    key = `wizard/${Date.now()}-${toWebpKey(safeFileName(file.name))}`;
  }

  const sb = supabaseServer();
  const { error } = await sb.storage.from(BUCKET).upload(key, outBytes, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`wizard media upload: ${error.message}`);

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(key);
  return { url: pub.publicUrl, kind };
}
