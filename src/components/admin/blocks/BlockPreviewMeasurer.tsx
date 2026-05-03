"use client";

import { useEffect } from "react";

/**
 * Rendered inside /block-preview/[slug] to post the rendered content's
 * true height back to the parent window (the template editor). The
 * template editor uses that to size each iframe wrapper so the block is
 * never cut off and there's no empty space below it.
 *
 * Re-measures on ResizeObserver changes and on every <img>/<iframe> load,
 * so late-loading images (poster, logos) get a correct final height.
 */
export default function BlockPreviewMeasurer() {
  useEffect(() => {
    let lastSent = -1;

    function send() {
      // Measure the body element directly — NOT documentElement. The
      // <html> element's scrollHeight is floored to the iframe's
      // viewport height, so when a block's content is shorter than
      // the parent's initial server-side estimate (computeNativeHeight)
      // the measurer reported the iframe height back unchanged and the
      // block never got a chance to shrink — leaving empty space below
      // in the template builder. body.offsetHeight is the body's true
      // rendered height, independent of viewport; both growing and
      // shrinking measurements come back accurately. body has
      // margin:0 padding:0 overflow:hidden via the inline <style> in
      // /block-preview, so offsetHeight equals content height.
      const h = document.body?.offsetHeight ?? 0;
      if (h <= 0 || h === lastSent) return;
      lastSent = h;
      try {
        window.parent.postMessage(
          { type: "block-preview-height", height: h },
          "*",
        );
      } catch {
        /* ignore */
      }
    }

    send();

    const ro = new ResizeObserver(() => send());
    ro.observe(document.body);

    // Images loaded after first paint (logos, posters) change the layout.
    const imgs = Array.from(document.querySelectorAll("img"));
    const cleanups = imgs.map((img) => {
      if (img.complete) return () => {};
      const onLoad = () => send();
      img.addEventListener("load", onLoad, { once: true });
      img.addEventListener("error", onLoad, { once: true });
      return () => {
        img.removeEventListener("load", onLoad);
        img.removeEventListener("error", onLoad);
      };
    });

    return () => {
      ro.disconnect();
      cleanups.forEach((c) => c());
    };
  }, []);

  return null;
}
