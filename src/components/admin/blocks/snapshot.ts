"use client";

import { toBlob } from "html-to-image";
import { uploadBlockSnapshot } from "@/app/admin/blocks/actions";

/**
 * Captures the block's live-preview DOM node to a PNG and uploads it
 * so the variant carousel tile refreshes.
 *
 * Two gotchas this helper exists to dodge:
 *  1. Cross-origin iframes (the YouTube embed) throw SecurityError inside
 *     html-to-image, aborting the whole capture. Filter them out.
 *  2. HTMLVideoElements can't be rasterised to canvas reliably.
 *     Filter those too — the poster <img> behind them captures fine.
 *  3. If an <img> hasn't finished loading when toBlob runs, it renders as
 *     blank space. Wait for every descendant <img> to report complete
 *     before capturing.
 *
 * Errors are logged, not thrown — snapshot is nice-to-have; the actual
 * save shouldn't be blocked by a failed screenshot.
 */
export async function captureAndUploadBlockSnapshot(
  blockId: string,
  node: HTMLElement,
): Promise<{ ok: boolean }> {
  try {
    await waitForImagesLoaded(node);
    const blob = await toBlob(node, {
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: "#ffffff",
      filter: (n) => {
        const tag = (n as HTMLElement).tagName;
        return tag !== "IFRAME" && tag !== "VIDEO";
      },
    });
    if (!blob) return { ok: false };
    const fd = new FormData();
    fd.append("file", new File([blob], `snap-${blockId}.png`, { type: "image/png" }));
    await uploadBlockSnapshot(blockId, fd);
    return { ok: true };
  } catch (e) {
    console.error("snapshot capture failed:", e);
    return { ok: false };
  }
}

async function waitForImagesLoaded(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalHeight > 0) return;
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}
