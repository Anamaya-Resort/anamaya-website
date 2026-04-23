"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
// v3 consolidated Color, FontFamily, FontSize, etc. into extension-text-style.
import { TextStyle, Color, FontFamily, FontSize } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState } from "react";
import Toolbar from "./Toolbar";
import AiRewriteModal from "./AiRewriteModal";
import { prettifyHtml } from "./prettifyHtml";

/**
 * Reusable WYSIWYG + raw-HTML editor used anywhere a block accepts free
 * HTML content (rich_text, rich_bg, image_text, …). Keeps its own
 * internal editor state so typing is smooth; the parent receives the
 * current HTML via onChange and commits (to the live preview) on onBlur.
 *
 * - Visual tab: TipTap editor + toolbar.
 * - HTML tab: plain textarea showing the serialised HTML.
 * - Switching tabs syncs content both ways.
 *
 * Two AI buttons in the toolbar open a modal. The modal posts to the
 * `/api/ai/rewrite` endpoint (to be built when the user ships the LLM
 * module). For now it returns a placeholder so the UI wiring is done.
 */
export default function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Start typing…",
  minHeight = 200,
}: {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [rawHtml, setRawHtml] = useState(value);
  const [aiOpen, setAiOpen] = useState<false | "rewrite" | "translate">(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose-anamaya max-w-none focus:outline-none",
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setRawHtml(html);
      onChange(html);
    },
    onBlur: () => onBlur?.(),
    immediatelyRender: false, // avoid SSR hydration mismatch
  });

  // If the parent's value changes for reasons outside the editor
  // (AI rewrite, initial load after save/redirect), re-sync the editor.
  // Skipped while in HTML mode so typing in the textarea doesn't trigger
  // a setContent on the hidden editor every keystroke.
  useEffect(() => {
    if (!editor) return;
    if (mode === "html") return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
      setRawHtml(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor, mode]);

  function commitRawHtml() {
    // Moving from HTML tab back to Visual: parse into the editor, then
    // normalise. Using editor.getHTML() after setContent keeps parent
    // state, rawHtml and the editor all in sync so the useEffect sync
    // below doesn't fire a redundant second setContent.
    if (!editor) return;
    editor.commands.setContent(rawHtml, { emitUpdate: false });
    const normalized = editor.getHTML();
    setRawHtml(normalized);
    onChange(normalized);
  }

  function applyAiResult(html: string) {
    if (!editor) return;
    editor.commands.setContent(html, { emitUpdate: false });
    const normalized = editor.getHTML();
    setRawHtml(normalized);
    onChange(normalized);
    editor.commands.focus(); // caret back in editor after modal closes
  }

  return (
    <div className="rounded-md border border-zinc-300 bg-white">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-200">
        <div className="flex">
          <TabButton
            active={mode === "visual"}
            onClick={() => {
              if (mode === "html") commitRawHtml();
              setMode("visual");
            }}
          >
            Visual
          </TabButton>
          <TabButton
            active={mode === "html"}
            onClick={() => {
              // Prettify so HTML mode is human-readable — block tags on
              // their own lines, nested list items indented. TipTap
              // normalises whitespace on re-parse so this is lossless
              // round-tripping back to Visual.
              if (editor) setRawHtml(prettifyHtml(editor.getHTML()));
              setMode("html");
            }}
          >
            HTML
          </TabButton>
        </div>
        {mode === "visual" && editor && (
          <div className="px-2">
            <Toolbar
              editor={editor}
              onOpenAi={(kind) => setAiOpen(kind)}
            />
          </div>
        )}
      </div>

      {/* Body */}
      {mode === "visual" ? (
        // No onBlur here — useEditor({ onBlur }) already handles it; a
        // second handler on this wrapper was firing commit twice.
        <div className="px-3 py-2">
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="text-xs italic text-anamaya-charcoal/40">Loading…</div>
          )}
        </div>
      ) : (
        <textarea
          value={rawHtml}
          onChange={(e) => {
            setRawHtml(e.target.value);
            onChange(e.target.value);
          }}
          onBlur={onBlur}
          className="block w-full resize-y bg-white px-3 py-2 font-mono text-xs text-anamaya-charcoal focus:outline-none"
          style={{ minHeight }}
        />
      )}

      {aiOpen && editor && (
        <AiRewriteModal
          kind={aiOpen}
          currentHtml={editor.getHTML()}
          onClose={() => {
            setAiOpen(false);
            editor.commands.focus(); // caret back in editor
          }}
          onApply={(html) => {
            applyAiResult(html);
            setAiOpen(false);
          }}
        />
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
      className={`border-b-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
        active
          ? "border-anamaya-green text-anamaya-charcoal"
          : "border-transparent text-anamaya-charcoal/50 hover:text-anamaya-charcoal"
      }`}
    >
      {children}
    </button>
  );
}

export type { Editor };
