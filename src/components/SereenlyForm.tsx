"use client";

import Script from "next/script";
import DeferUntilVisible from "./DeferUntilVisible";

// Wraps a Sereenly (GoHighLevel) inline form.
// Heavy parts (the iframe + the form_embed.js auto-resize script) only load
// when the wrapper scrolls near the viewport — keeps these off the critical
// path for pages where the form is in the footer.

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
    <DeferUntilVisible
      minHeight={initialHeight}
      className={className}
      fallback={
        <div
          className="flex w-full items-center justify-center text-xs text-anamaya-charcoal/50"
          style={{ minHeight: initialHeight }}
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
        style={{ width: "100%", minHeight: initialHeight, border: "none" }}
      />
      <Script
        src="https://link.msgsndr.com/js/form_embed.js"
        strategy="lazyOnload"
      />
    </DeferUntilVisible>
  );
}
