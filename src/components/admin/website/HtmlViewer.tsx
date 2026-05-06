"use client";

import { useState } from "react";
import { prettifyHtml } from "@/components/admin/rte/prettifyHtml";

/**
 * Read-only viewer for migrated HTML. Mirrors the Visual / HTML tab UI
 * from RichTextEditor so the migrated WP body, raw shortcoded content,
 * etc. can be inspected in the same way authors edit live content.
 *
 * Visual: rendered with .prose-anamaya so headings / lists / links look
 *   the way they would on the real site.
 * HTML:   prettified source in a monospaced block.
 *
 * Source HTML comes from migrated WP content (trusted), so
 * dangerouslySetInnerHTML is acceptable here. If we ever surface
 * untrusted user-supplied HTML through this component, sanitise first.
 */
export default function HtmlViewer({
  html,
  minHeight = 200,
}: {
  html: string;
  minHeight?: number;
}) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  return (
    <div>
      <div className="flex border-b border-[#dcdcde] bg-[#f6f7f7]">
        <TabButton active={mode === "visual"} onClick={() => setMode("visual")}>
          Visual
        </TabButton>
        <TabButton active={mode === "html"} onClick={() => setMode("html")}>
          HTML
        </TabButton>
      </div>
      {mode === "visual" ? (
        <div
          className="prose-anamaya prose-anamaya-block overflow-auto px-3 py-3 text-[14px] text-[#1d2327]"
          style={{ maxHeight: 480, minHeight }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre
          className="overflow-auto px-3 py-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#50575e]"
          style={{ maxHeight: 480, minHeight }}
        >
          {prettifyHtml(html)}
        </pre>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-4 py-2 text-[12px] font-semibold uppercase tracking-wider transition-colors ${
        active
          ? "border-[#2271b1] text-[#1d2327]"
          : "border-transparent text-[#50575e] hover:text-[#1d2327]"
      }`}
    >
      {children}
    </button>
  );
}
