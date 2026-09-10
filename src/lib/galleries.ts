import "server-only";
import { aoSupabaseOrNull } from "@/lib/ao-supabase";
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
 * Read with the anon key, so RLS decides what is visible: only
 * galleries marked published come back. An unpublished one resolves to
 * nothing rather than leaking work in progress.
 */
export async function getGalleryImages(
  code: string,
): Promise<GalleryImage[]> {
  const sb = aoSupabaseOrNull();
  if (!sb || !code) return [];

  const { data: gallery } = await sb
    .from("video_galleries")
    .select("id")
    .eq("code", code)
    .eq("is_published", true)
    .maybeSingle();
  if (!gallery) return [];

  const { data: items } = await sb
    .from("video_gallery_items")
    .select("asset_id, sort_order, caption")
    .eq("gallery_id", gallery.id)
    .order("sort_order", { ascending: true });

  const rows = (items ?? []) as {
    asset_id: string;
    sort_order: number;
    caption: string | null;
  }[];
  if (rows.length === 0) return [];

  const { data: assets } = await sb
    .from("video_assets")
    .select("id, proxy_path, width, height, file_name")
    .in(
      "id",
      rows.map((r) => r.asset_id),
    );

  const byId = new Map(
    ((assets ?? []) as {
      id: string;
      proxy_path: string | null;
      width: number | null;
      height: number | null;
      file_name: string;
    }[]).map((a) => [a.id, a]),
  );

  const base = (process.env.AO_SUPABASE_URL ?? "").replace(/\/+$/, "");

  // Order comes from the gallery, not from the asset query.
  const out: GalleryImage[] = [];
  for (const r of rows) {
    const a = byId.get(r.asset_id);
    if (!a?.proxy_path) continue;
    out.push({
      url: `${base}/storage/v1/object/public/video-proxies/${a.proxy_path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`,
      alt: r.caption ?? a.file_name.replace(/\.[^.]+$/, ""),
      width: a.width ?? undefined,
      height: a.height ?? undefined,
      caption: r.caption ?? undefined,
    });
  }
  return out;
}
