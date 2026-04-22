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
      // Use scrollHeight so overflow:hidden on body (we set that) doesn't
      // clip the measurement.
      const h = document.documentElement.scrollHeight;
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
