"use client";

import { useEffect } from "react";

// Injects the admin's free-form "custom head / body" tracking HTML so that
// any <script> it contains ACTUALLY executes. React's dangerouslySetInnerHTML
// does not run injected <script> tags, so we parse the markup and re-create
// each node (cloning scripts forces the browser to execute them). Runs once
// per mount; guarded by a data-flag so client navigations don't double-inject.

function injectInto(target: HTMLElement, html: string, flag: string) {
  if (!html.trim()) return;
  if (document.querySelector(`[data-tracking-injected="${flag}"]`)) return;
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const marker = document.createElement("meta");
  marker.setAttribute("data-tracking-injected", flag);
  target.appendChild(marker);
  for (const node of Array.from(tpl.content.childNodes)) {
    if (node.nodeName === "SCRIPT") {
      const src = node as HTMLScriptElement;
      const s = document.createElement("script");
      for (const attr of Array.from(src.attributes)) s.setAttribute(attr.name, attr.value);
      s.text = src.text;
      target.appendChild(s);
    } else {
      target.appendChild(node.cloneNode(true));
    }
  }
}

export default function CustomTrackingCode({
  head,
  body,
}: {
  head: string;
  body: string;
}) {
  useEffect(() => {
    injectInto(document.head, head, "head");
    injectInto(document.body, body, "body");
  }, [head, body]);
  return null;
}
