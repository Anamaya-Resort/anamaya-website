"use client";

import Script from "next/script";
import DeferUntilVisible from "./DeferUntilVisible";

// Wraps a Sereenly (GoHighLevel) inline form.
// - iframe + form_embed.js load only when the wrapper scrolls near the viewport
// - the iframe has no CSS min-height so form_embed.js is free to shrink it
//   to match actual form content. Height starts at initialHeight (used while
//   the script is still booting) and gets adjusted from postMessage.

type Props = {
  formId: string;
  title?: string;
  formName?: string;
  /** Initial height in px before auto-resize kicks in. */
  initialHeight?: number;
  className?: string;
};

export default function SereenlyForm({
  formId,
  title = "Signup form",
  formName = "Newsletter",
  initialHeight = 402,
  className,
}: Props) {
  const src = `https://link.sereenly.com/widget/form/${formId}`;
  const iframeId = `inline-${formId}`;

  return (
    <DeferUntilVisible
      className={className}
      fallback={
        <div
          className="flex w-full items-center justify-center text-xs text-anamaya-charcoal/50"
          style={{ height: initialHeight }}
        >
          Loading…
        </div>
      }
    >
      <iframe
        src={src}
        id={iframeId}
        title={title}
        data-layout='{"id":"INLINE"}'
        data-trigger-type="alwaysShow"
        data-trigger-value=""
        data-activation-type="alwaysActivated"
        data-activation-value=""
        data-deactivation-type="neverDeactivate"
        data-deactivation-value=""
        data-form-name={formName}
        data-height={initialHeight}
        data-layout-iframe-id={iframeId}
        data-form-id={formId}
        allow="autoplay; encrypted-media; gyroscope;"
        loading="lazy"
        // width only — no min-height — so form_embed.js can resize freely.
        style={{ width: "100%", height: initialHeight, border: "none", display: "block" }}
      />
      <Script
        src="https://link.msgsndr.com/js/form_embed.js"
        strategy="lazyOnload"
      />
    </DeferUntilVisible>
  );
}
