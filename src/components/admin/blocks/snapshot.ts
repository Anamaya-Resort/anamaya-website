"use client";

import { toBlob } from "html-to-image";
import { uploadBlockSnapshot } from "@/app/admin/blocks/actions";

/**
 * Captures the block's live-preview DOM node to a PNG and uploads it
 * so the variant carousel tile refreshes.
 *
 * Gotchas this helper works around:
 *  1. Cross-origin iframes (the YouTube embed) throw SecurityError
 *     inside html-to-image, aborting the whole capture. We filter them
 *     out AND skip any ancestor div marked `data-snapshot-skip="true"`
 *     so the empty click-blocker overlay doesn't confuse the capture.
 *  2. HTMLVideoElements can't be rasterised to canvas reliably.
 *  3. If an <img> hasn't finished loading when toBlob runs, it renders
 *     as blank space — so we wait on every descendant image first.
 *
 * Progress is logged to the console so the user can see what's
 * happening when a snapshot fails to update.
 */
export async function captureAndUploadBlockSnapshot(
  blockId: string,
  node: HTMLElement,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    console.log("[snapshot] capturing", blockId);
    await waitForImagesLoaded(node);
    console.log("[snapshot] images ready");
    const blob = await toBlob(node, {
      pixelRatio: 1,
      cacheBust: false,
      backgroundColor: "#ffffff",
      filter: (n) => {
        const el = n as HTMLElement;
        const tag = el.tagName;
        if (tag === "IFRAME" || tag === "VIDEO") return false;
        if (el.dataset?.snapshotSkip === "true") return false;
        return true;
      },
    });
    console.log("[snapshot] toBlob size:", blob?.size ?? "null");
    if (!blob) return { ok: false, reason: "toBlob returned null" };
    const fd = new FormData();
    fd.append("file", new File([blob], `snap-${blockId}.png`, { type: "image/png" }));
    await uploadBlockSnapshot(blockId, fd);
    console.log("[snapshot] upload ok");
    return { ok: true };
  } catch (e) {
    console.error("[snapshot] failed:", e);
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

async function waitForImagesLoaded(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalHeight > 0) return;
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        // Safety cap: never block capture for more than 3 s on a single img.
        setTimeout(done, 3000);
      });
    }),
  );
}
