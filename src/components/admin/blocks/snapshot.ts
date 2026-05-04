"use client";

import { toCanvas } from "html-to-image";
import { uploadBlockSnapshot } from "@/app/admin/(default)/blocks/actions";

/**
 * Captures the block's live-preview DOM node to a JPEG and uploads it
 * so the variant carousel tile refreshes.
 *
 * Produces JPEG (not PNG) because the PNG for a hero block can be 2+ MB
 * — Next's default server-action body limit is 1 MB, so PNG uploads got
 * rejected with 400. JPEG at quality 0.85 is typically ~150 KB for the
 * same image. The server action resizes + re-encodes as WebP anyway;
 * the wire format is purely a transport concern.
 *
 * Gotchas this helper works around:
 *  1. Cross-origin iframes (YouTube embed) throw SecurityError inside
 *     html-to-image, aborting capture. Filtered by tag + any ancestor
 *     with data-snapshot-skip="true".
 *  2. HTMLVideoElements can't be rasterised to canvas reliably. Same
 *     filter handles them.
 *  3. If an <img> hasn't finished loading when capture runs, it
 *     renders as blank space — we await every descendant image first.
 *
 * Progress and errors are logged to the console so failures are visible.
 */
export async function captureAndUploadBlockSnapshot(
  blockId: string,
  node: HTMLElement,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    console.log("[snapshot] capturing", blockId);
    // If the live preview is an iframe (used for async/server-only
    // blocks like featured_retreats and testimonials), the iframe
    // content is what we actually want to snapshot — the wrapper has
    // no real markup. Same-origin /block-preview lets us reach into
    // contentDocument.
    const iframe = node.querySelector("iframe") as HTMLIFrameElement | null;
    if (iframe?.contentDocument?.body) {
      const inner = iframe.contentDocument.body;
      await Promise.all([
        waitForImagesLoaded(inner),
        waitForFonts(iframe.contentDocument),
      ]);
      return await captureAndUpload(blockId, inner);
    }
    await Promise.all([waitForImagesLoaded(node), waitForFonts(document)]);
    console.log("[snapshot] images + fonts ready");
    return await captureAndUpload(blockId, node);
  } catch (e) {
    console.error("[snapshot] failed:", e);
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/** Wait for any pending web fonts to finish loading. Without this,
 *  text in the snapshot can render in the fallback font and look
 *  wrong against the rest of the UI. */
async function waitForFonts(doc: Document): Promise<void> {
  const fonts = (doc as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
  if (fonts?.ready) {
    try {
      await fonts.ready;
    } catch {
      /* font loader not supported — ignore */
    }
  }
}

async function captureAndUpload(
  blockId: string,
  node: HTMLElement,
): Promise<{ ok: boolean; reason?: string }> {
  const canvas = await toCanvas(node, {
    pixelRatio: 1.5,
    // cacheBust forces fresh GETs for image/font URLs, side-stepping
    // cases where the browser served a tainted cross-origin response
    // earlier in the session and the canvas would otherwise come back
    // blank or trigger a SecurityError on toBlob.
    cacheBust: true,
    backgroundColor: "#ffffff",
    filter: (n) => {
      const el = n as HTMLElement;
      const tag = el.tagName;
      if (tag === "IFRAME" || tag === "VIDEO") return false;
      if (el.dataset?.snapshotSkip === "true") return false;
      return true;
    },
    // Strip the off-screen positioning the editor puts on its snapshot
    // source (position: fixed; left: -10000px). Without this the clone
    // ends up outside the SVG viewport and capture comes back blank.
    style: {
      position: "static",
      transform: "none",
      margin: "0",
      left: "0",
      top: "0",
      right: "auto",
      bottom: "auto",
      inset: "auto",
    },
  });
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  console.log("[snapshot] jpeg size:", blob?.size ?? "null");
  if (!blob) return { ok: false, reason: "canvas.toBlob returned null" };
  const fd = new FormData();
  fd.append("file", new File([blob], `snap-${blockId}.jpg`, { type: "image/jpeg" }));
  await uploadBlockSnapshot(blockId, fd);
  console.log("[snapshot] upload ok");
  return { ok: true };
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
        setTimeout(done, 3000);
      });
    }),
  );
}
