"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { supabaseServer } from "@/lib/supabase-server";

const BUCKET = "images";

export async function updateBlockContent(id: string, content: unknown) {
  const sb = supabaseServer();
  const { error } = await sb
    .from("blocks")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/blocks");
  revalidatePath(`/admin/blocks/${id}`);
  // Invalidate everything because blocks can live on many pages
  revalidatePath("/", "layout");
}

export async function renameBlock(id: string, name: string) {
  const sb = supabaseServer();
  const { error } = await sb.from("blocks").update({ name }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/blocks");
}

/**
 * Upload an image file (from a press-bar logo slot) to Supabase Storage.
 * Returns the public URL + intrinsic dimensions so the client can update
 * the logo's width/height in the block content.
 */
export async function uploadPressLogo(
  formData: FormData,
): Promise<{ url: string; width: number; height: number }> {
  const file = formData.get("file") as File | null;
  if (!file || typeof file === "string") {
    throw new Error("No file provided");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File too large (max 5 MB)");
  }

  const buf = Buffer.from(await file.arrayBuffer());

  // Normalize to webp and cap width at 600 so featured logos still look sharp.
  const meta = await sharp(buf).metadata();
  const targetWidth = Math.min(meta.width ?? 600, 600);
  const out = await sharp(buf).resize({ width: targetWidth }).webp({ quality: 90 }).toBuffer();
  const outMeta = await sharp(out).metadata();

  const safeName =
    (file.name || "logo")
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "logo";
  const key = `uploads/press/${randomUUID().slice(0, 8)}-${safeName}.webp`;

  const sb = supabaseServer();
  const { error } = await sb.storage.from(BUCKET).upload(key, out, {
    contentType: "image/webp",
    upsert: false,
  });
  if (error) throw new Error(`upload: ${error.message}`);

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(key);
  return {
    url: pub.publicUrl,
    width: outMeta.width ?? targetWidth,
    height: outMeta.height ?? 0,
  };
}
