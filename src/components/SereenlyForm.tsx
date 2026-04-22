"use client";

import Script from "next/script";

// Wraps a Sereenly (GoHighLevel) inline form embed the way v2 does it —
// iframe with the full set of data-* attrs + the form_embed.js script that
// listens for postMessage from the form and auto-resizes the iframe to
// match content. Without the script you get an ugly scrollbar.

type Props = {
  formId: string;
  title?: string;
  formName?: string;
  /** Initial height in px before auto-resize kicks in. v2 uses 402. */
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
    <>
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
        className={className}
        style={{ width: "100%", minHeight: initialHeight, border: "none" }}
      />
      {/* GoHighLevel / Sereenly iframe-resize script — same as v2 */}
      <Script
        src="https://link.msgsndr.com/js/form_embed.js"
        strategy="lazyOnload"
      />
    </>
  );
}
