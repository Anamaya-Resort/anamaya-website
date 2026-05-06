"use client";

import { useState } from "react";
import RichTextEditor from "@/components/admin/rte/RichTextEditor";

/**
 * Body editor for the website-builder edit page. Wraps the same TipTap
 * RichTextEditor used in the block editors (so it ships with the WP-style
 * formatting toolbar, Visual/HTML tabs, and AI Rewrite/Translate buttons)
 * and feeds the form via a hidden input so the existing server action
 * (which reads `cms_body_html` from FormData) keeps working unchanged.
 */
export default function BodyEditor({
  name,
  defaultValue,
  placeholder,
  minHeight,
}: {
  name: string;
  defaultValue: string;
  placeholder?: string;
  minHeight?: number;
}) {
  const [html, setHtml] = useState(defaultValue);
  return (
    <>
      <input type="hidden" name={name} value={html} />
      <RichTextEditor
        value={html}
        onChange={setHtml}
        placeholder={placeholder}
        minHeight={minHeight}
      />
    </>
  );
}
