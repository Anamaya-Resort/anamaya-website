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

/** Default blank content per block type. */
function emptyContentFor(typeSlug: string): unknown {
  switch (typeSlug) {
    case "rich_text":  return { html: "" };
    case "hero":       return { title: "" };
    case "cta_banner": return { heading: "", cta: { label: "", href: "" } };
    case "press_bar":  return { heading: "Recommended by:", logos: [], bg_color: "teal-muted" };
    default:           return {};
  }
}

/** Create a new blank block of the given type and return its id. */
export async function createBlock(typeSlug: string, name: string): Promise<string> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("blocks")
    .insert({ type_slug: typeSlug, name, content: emptyContentFor(typeSlug) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/blocks");
  return data.id;
}

export async function deleteBlock(id: string) {
  const sb = supabaseServer();
  // Also removes any block_usages via cascade.
  const { error } = await sb.from("blocks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/blocks");
  revalidatePath("/", "layout");
}

/**
 * Persist a client-generated WebP snapshot of a block's live preview.
 * Called immediately after a save so the variant carousel always shows
 * a fresh thumbnail. Scales the incoming PNG/WebP to half resolution
 * before storing to keep file sizes small.
 */
export async function uploadBlockSnapshot(
  blockId: string,
  formData: FormData,
): Promise<{ url: string }> {
  const file = formData.get("file") as File | null;
  if (!file || typeof file === "string") throw new Error("No snapshot provided");

  const buf = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(buf).metadata();
  const targetWidth = Math.max(400, Math.floor((meta.width ?? 1200) / 2));
  const webp = await sharp(buf)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  const sb = supabaseServer();
  const key = `uploads/block-snapshots/${blockId}-${Date.now()}.webp`;
  const { error: upErr } = await sb.storage.from(BUCKET).upload(key, webp, {
    contentType: "image/webp",
    upsert: false,
  });
  if (upErr) throw new Error(`snapshot upload: ${upErr.message}`);
  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(key);

  const { error: rowErr } = await sb
    .from("blocks")
    .update({ snapshot_url: pub.publicUrl, snapshot_updated_at: new Date().toISOString() })
    .eq("id", blockId);
  if (rowErr) throw new Error(`snapshot row update: ${rowErr.message}`);

  revalidatePath("/admin/blocks");
  revalidatePath(`/admin/blocks/${blockId}`);
  return { url: pub.publicUrl };
}

/** Copy an existing block's content into a new block. Returns the new id. */
export async function duplicateBlock(id: string): Promise<string> {
  const sb = supabaseServer();
  const { data: source, error: readErr } = await sb
    .from("blocks")
    .select("type_slug, name, content")
    .eq("id", id)
    .maybeSingle();
  if (readErr || !source) throw new Error("Source block not found");

  const { data, error } = await sb
    .from("blocks")
    .insert({
      type_slug: source.type_slug,
      name: `${source.name} (copy)`,
      content: source.content,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/blocks");
  return data.id;
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
