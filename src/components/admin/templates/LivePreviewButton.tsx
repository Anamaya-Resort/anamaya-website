"use client";

import { useState } from "react";

/**
 * "Live Preview" button group for the template editor.
 * Two actions:
 *   - Open in a new tab (the public, shareable preview URL)
 *   - Copy the absolute URL to the clipboard so the editor can paste
 *     it into Slack / email and send to a teammate.
 *
 * The preview URL itself sits at /preview/template/{id} — public, no
 * auth, robots-noindex.
 */
export default function LivePreviewButton({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);

  function copyAbsoluteUrl() {
    const absolute =
      typeof window === "undefined"
        ? href
        : new URL(href, window.location.origin).toString();
    void navigator.clipboard?.writeText(absolute).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {
        /* clipboard unavailable */
      },
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-anamaya-green px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-anamaya-green-dark"
      >
        <ExternalIcon /> Live Preview
      </a>
      <button
        type="button"
        onClick={copyAbsoluteUrl}
        className="rounded-full border border-zinc-300 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-50"
        title="Copy the public preview URL — share it with anyone (no admin login needed)."
      >
        {copied ? "Copied!" : "Copy URL"}
      </button>
    </div>
  );
}

function ExternalIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M19 14v6H4V5h6" />
    </svg>
  );
}
