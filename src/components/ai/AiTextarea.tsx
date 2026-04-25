"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  registerSurface,
  nextSurfaceId,
  type EditorSurface,
} from "@/lib/ai/editor-surfaces";

type Props = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "ref"
> & {
  /** Page-level context the AI tools should ground prompts in. */
  pageContext?: Record<string, unknown>;
};

/**
 * Drop-in replacement for <textarea> that registers itself with the AI
 * surface registry. Functionally identical for forms — value persists
 * via name/defaultValue exactly as before.
 *
 * Mutations (replaceSelection, insertAtCursor) dispatch a bubbled `input`
 * event so any controlled-component or form-state listener sees the
 * change as if the user typed it.
 */
export default function AiTextarea({ pageContext, ...props }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = useMemo(() => nextSurfaceId("textarea"), []);

  // Keep pageContext in a ref so getPageContext() always returns the
  // latest value without forcing the surface to re-register on every
  // render (registration is keyed on element identity, not props).
  const pageContextRef = useRef(pageContext);
  pageContextRef.current = pageContext;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const surface: EditorSurface = {
      id,
      element: el,
      getValue: () => el.value,
      setValue: (v) => {
        el.value = v;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      },
      getSelection: () => {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (start == null || end == null || start === end) return null;
        return { start, end, text: el.value.slice(start, end) };
      },
      replaceSelection: (replacement) => {
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? start;
        const next = el.value.slice(0, start) + replacement + el.value.slice(end);
        el.value = next;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.focus();
        const caret = start + replacement.length;
        el.setSelectionRange(caret, caret);
      },
      replaceRange: (start, end, replacement) => {
        const s = Math.max(0, Math.min(start, el.value.length));
        const e = Math.max(s, Math.min(end, el.value.length));
        const next = el.value.slice(0, s) + replacement + el.value.slice(e);
        el.value = next;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.focus();
        const caret = s + replacement.length;
        el.setSelectionRange(caret, caret);
      },
      insertAtCursor: (text) => {
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? start;
        const next = el.value.slice(0, start) + text + el.value.slice(end);
        el.value = next;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        const caret = start + text.length;
        el.setSelectionRange(caret, caret);
      },
      getPageContext: () => pageContextRef.current ?? {},
    };
    return registerSurface(surface);
  }, [id]);

  return <textarea ref={ref} data-ai-surface={id} {...props} />;
}
