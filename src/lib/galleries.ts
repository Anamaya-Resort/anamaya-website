import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aoSupabaseOrNull, aoSupabaseAdminOrNull } from "@/lib/ao-supabase";
import type { GalleryImage } from "@/types/blocks";

/**
 * Gallery contents — live from AnamayaOS `video_galleries`, the same
 * pattern as rooms / retreats_calendar / service_menu. This site does
 * not own or cache the photos.
 *
 * An editor curates a gallery once in AnamayaOS and drops its code
 * (gallery_1, gallery_2, ...) into a gallery block here. Every page or
 * template referencing that code then follows whatever the gallery
 * holds, with no re-uploading and no per-page image lists to maintain.
 *
 * Two readers below, and the difference matters. The public one reads
 * with the anon key so RLS decides what is visible: published
 * galleries only, and an unpublished one resolves to nothing rather
 * than leaking work in progress. The admin ones read with the service
 * key so the block editor can also see and preview drafts.
 */

const BUCKET = "video-proxies";

function storageUrl(path: string | null | undefined): string | null {
  const base = (process.env.AO_SUPABASE_URL ?? "").replace(/\/+$/, "");
  if (!base || !path) return null;
  return `${base}/storage/v1/object/public/${BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

/**
 * The images of one gallery, in the order the gallery puts them in.
 * Shared by the public and admin readers so both surfaces resolve a
 * gallery identically — only the client, and therefore the visibility
 * rules, differ.
 */
async function imagesForGalleryId(
  sb: SupabaseClient,
  galleryId: string,
): Promise<GalleryImage[]> {
  const { data: items } = await sb
    .from("video_gallery_items")
    .select("asset_id, sort_order, caption")
    .eq("gallery_id", galleryId)
    .order("sort_order", { ascending: true });

  const rows = (items ?? []) as {
    asset_id: string;
    sort_order: number;
    caption: string | null;
  }[];
  if (rows.length === 0) return [];

  const { data: assets } = await sb
    .from("video_assets")
    .select("id, proxy_path, thumb_path, mime_type, width, height, file_name")
    .in(
      "id",
      rows.map((r) => r.asset_id),
    );

  const byId = new Map(
    (
      (assets ?? []) as {
        id: string;
        proxy_path: string | null;
        thumb_path: string | null;
        mime_type: string;
        width: number | null;
        height: number | null;
        file_name: string;
      }[]
    ).map((a) => [a.id, a]),
  );

  // Order comes from the gallery, not from the asset query.
  const out: GalleryImage[] = [];
  for (const r of rows) {
    const a = byId.get(r.asset_id);
    if (!a) continue;

    // A video's proxy is an mp4, which cannot go in an <img>. Its
    // still is the poster frame, and the file itself is carried
    // separately for the lightbox to play. Without a poster there is
    // nothing to show in the grid, so it is skipped rather than
    // rendered as a broken tile.
    const isVideo = a.mime_type.startsWith("video/");
    const still = storageUrl(isVideo ? a.thumb_path : a.proxy_path);
    if (!still) continue;

    out.push({
      url: still,
      alt: r.caption ?? a.file_name.replace(/\.[^.]+$/, ""),
      width: a.width ?? undefined,
      height: a.height ?? undefined,
      caption: r.caption ?? undefined,
      video_url: isVideo ? (storageUrl(a.proxy_path) ?? undefined) : undefined,
    });
  }
  return out;
}

/**
 * Public render path: a published gallery's images, or nothing.
 *
 * An unknown, unpublished or empty code yields an empty list and the
 * block renders nothing — the same outcome as an empty gallery, never
 * a broken page.
 */
export async function getGalleryImages(code: string): Promise<GalleryImage[]> {
  const sb = aoSupabaseOrNull();
  if (!sb || !code) return [];

  // limit(1) rather than maybeSingle(): the code is unique per org, so
  // a second org publishing the same code would make maybeSingle throw
  // and take the page down. Taking the first is the graceful reading
  // of an ambiguity that should not arise.
  const { data: found } = await sb
    .from("video_galleries")
    .select("id")
    .eq("code", code)
    .eq("is_published", true)
    .limit(1);
  const gallery = (found ?? [])[0] as { id: string } | undefined;
  if (!gallery) return [];

  return imagesForGalleryId(sb, gallery.id);
}

/** One row in the block editor's gallery chooser. */
export type GallerySummary = {
  code: string;
  name: string;
  description: string | null;
  is_published: boolean;
  item_count: number;
  /** A few thumbnails, so a gallery is recognisable without opening it. */
  previews: string[];
};

/** Thumbnails shown per row in the chooser. */
const PREVIEW_N = 5;

/**
 * Every gallery in AnamayaOS, for the chooser.
 *
 * Drafts included, marked as such. An editor who could only see
 * published galleries would pick a code, get an empty block, and have
 * no way to learn that the gallery simply is not published yet.
 *
 * Admin-only, enforced by the route that calls it.
 */
export async function listGalleriesForChooser(): Promise<GallerySummary[]> {
  const sb = aoSupabaseAdminOrNull();
  if (!sb) return [];

  const { data: galleries } = await sb
    .from("video_galleries")
    .select("id, code, name, description, is_published, updated_at")
    .order("updated_at", { ascending: false });

  const rows = (galleries ?? []) as {
    id: string;
    code: string;
    name: string;
    description: string | null;
    is_published: boolean;
  }[];
  if (rows.length === 0) return [];

  // Membership for every gallery in one query, then grouped here. One
  // query per gallery would be a round trip each, on a modal that
  // opens every time somebody edits a gallery block.
  const { data: items } = await sb
    .from("video_gallery_items")
    .select("gallery_id, asset_id, sort_order")
    .in(
      "gallery_id",
      rows.map((g) => g.id),
    )
    .order("sort_order", { ascending: true });

  const byGallery = new Map<string, string[]>();
  for (const it of (items ?? []) as { gallery_id: string; asset_id: string }[]) {
    const list = byGallery.get(it.gallery_id) ?? [];
    list.push(it.asset_id);
    byGallery.set(it.gallery_id, list);
  }

  const wanted = [...byGallery.values()].flatMap((ids) => ids.slice(0, PREVIEW_N));
  const thumbById = new Map<string, string>();
  if (wanted.length > 0) {
    const { data: assets } = await sb
      .from("video_assets")
      .select("id, thumb_path, proxy_path")
      .in("id", [...new Set(wanted)]);
    for (const a of (assets ?? []) as {
      id: string;
      thumb_path: string | null;
      proxy_path: string | null;
    }[]) {
      const url = storageUrl(a.thumb_path ?? a.proxy_path);
      if (url) thumbById.set(a.id, url);
    }
  }

  return rows.map((g) => {
    const ids = byGallery.get(g.id) ?? [];
    return {
      code: g.code,
      name: g.name,
      description: g.description,
      is_published: g.is_published,
      item_count: ids.length,
      previews: ids
        .slice(0, PREVIEW_N)
        .map((id) => thumbById.get(id))
        .filter((u): u is string => !!u),
    };
  });
}

/**
 * A gallery's images for the admin live preview, published or not —
 * an editor arranging a draft needs to see it before deciding to
 * publish it.
 */
export async function getGalleryImagesForAdmin(
  code: string,
): Promise<GalleryImage[]> {
  const sb = aoSupabaseAdminOrNull();
  if (!sb || !code) return [];

  const { data: found } = await sb
    .from("video_galleries")
    .select("id")
    .eq("code", code)
    .limit(1);
  const gallery = (found ?? [])[0] as { id: string } | undefined;
  if (!gallery) return [];

  return imagesForGalleryId(sb, gallery.id);
}
