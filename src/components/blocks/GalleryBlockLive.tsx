"use client";

import { useEffect, useState } from "react";
import type { GalleryContent, GalleryImage } from "@/types/blocks";
import GalleryBlockView from "./GalleryBlockView";

/**
 * Admin live-preview twin of GalleryBlock.
 *
 * The public block resolves its gallery code on the server, which the
 * admin preview cannot do — it re-renders in the browser as the editor
 * types. So this fetches the same contents through the admin route,
 * which unlike the public path can also see drafts: the editor is
 * usually looking at a gallery they have not published yet.
 *
 * With no code it behaves exactly like the public block, rendering the
 * images pasted into the block.
 */
export default function GalleryBlockLive({
  content,
  preview,
}: {
  content: GalleryContent;
  preview?: boolean;
}) {
  const code = content?.gallery_code?.trim() ?? "";
  // Keyed by code, so switching galleries never shows the previous
  // one's photographs while the new fetch is in flight.
  const [fetched, setFetched] = useState<{ code: string; images: GalleryImage[] } | null>(
    null,
  );
  const images = code ? (fetched?.code === code ? fetched.images : []) : undefined;

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/admin/galleries?code=${encodeURIComponent(code)}`);
        const json = await res.json();
        if (!cancelled) setFetched({ code, images: res.ok ? (json.images ?? []) : [] });
      } catch {
        // preview only; an unreachable gallery shows as empty
        if (!cancelled) setFetched({ code, images: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <GalleryBlockView content={content} preview={preview} overrideImages={images} />
  );
}
