"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  IndentDecrease,
  IndentIncrease,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Link2Off,
  Palette,
  Smile,
  Sparkles,
  Languages,
  Minus,
  Plus,
  CornerDownLeft,
} from "lucide-react";

type AiKind = "rewrite" | "translate";

const FONT_FAMILIES: { value: string; label: string }[] = [
  { value: "", label: "Default" },
  { value: "var(--font-inter), ui-sans-serif, system-ui, sans-serif", label: "Body (Inter)" },
  { value: "var(--font-oswald), ui-sans-serif, sans-serif", label: "Display (Oswald)" },
  { value: "Georgia, 'Times New Roman', serif", label: "Serif" },
  { value: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", label: "Monospace" },
];

const DEFAULT_FONT_SIZE_PX = 16;
const MIN_FONT_SIZE_PX = 10;
const MAX_FONT_SIZE_PX = 96;
// Per-click adjustment. 1 gives precise control; Shift+click could step
// larger if we later want to add that.
const FONT_SIZE_STEP_PX = 1;

/**
 * Toolbar ordered roughly like WordPress's classic editor:
 *   B I U S · H1 H2 H3 · Font Family · Font Size -/+ · UL OL indent ·
 *   align L C R J · link · color · emoji · line-break · AI rewrite ·
 *   AI translate
 * All buttons are 24×24 to stay compact. Active state uses the brand
 * green so users see which marks are on at the caret.
 */
export default function Toolbar({
  editor,
  onOpenAi,
}: {
  editor: Editor;
  onOpenAi: (kind: AiKind) => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);

  const currentFontSize = readFontSizePx(editor);
  const currentFontFamily = (editor.getAttributes("textStyle").fontFamily as string | undefined) ?? "";

  const btn = (active: boolean) =>
    `flex h-7 w-7 items-center justify-center rounded transition-colors ${
      active
        ? "bg-anamaya-green text-white"
        : "text-anamaya-charcoal/70 hover:bg-zinc-100 hover:text-anamaya-charcoal"
    }`;

  function adjustFontSize(delta: number) {
    const next = Math.max(
      MIN_FONT_SIZE_PX,
      Math.min(MAX_FONT_SIZE_PX, currentFontSize + delta),
    );
    editor.chain().focus().setFontSize(`${next}px`).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 py-1">
      {/* Inline formatting */}
      <button
        type="button"
        title="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive("bold"))}
      >
        <Bold size={14} />
      </button>
      <button
        type="button"
        title="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive("italic"))}
      >
        <Italic size={14} />
      </button>
      <button
        type="button"
        title="Underline"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btn(editor.isActive("underline"))}
      >
        <UnderlineIcon size={14} />
      </button>
      <button
        type="button"
        title="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btn(editor.isActive("strike"))}
      >
        <Strikethrough size={14} />
      </button>

      <Divider />

      {/* Headings */}
      <button
        type="button"
        title="Heading 1"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btn(editor.isActive("heading", { level: 1 }))}
      >
        <Heading1 size={14} />
      </button>
      <button
        type="button"
        title="Heading 2"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btn(editor.isActive("heading", { level: 2 }))}
      >
        <Heading2 size={14} />
      </button>
      <button
        type="button"
        title="Heading 3"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btn(editor.isActive("heading", { level: 3 }))}
      >
        <Heading3 size={14} />
      </button>

      <Divider />

      {/* Font family */}
      <select
        title="Font family"
        value={currentFontFamily}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") editor.chain().focus().unsetFontFamily().run();
          else editor.chain().focus().setFontFamily(v).run();
        }}
        className="h-7 max-w-[110px] rounded border border-transparent bg-white px-1.5 text-[11px] text-anamaya-charcoal/70 hover:border-zinc-200 focus:border-anamaya-green focus:outline-none"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Font size -/+ */}
      <button
        type="button"
        title="Decrease font size"
        onClick={() => adjustFontSize(-FONT_SIZE_STEP_PX)}
        className={btn(false)}
      >
        <Minus size={14} />
      </button>
      <span className="w-8 text-center font-mono text-[11px] text-anamaya-charcoal/60" title="Current font size">
        {currentFontSize}
      </span>
      <button
        type="button"
        title="Increase font size"
        onClick={() => adjustFontSize(FONT_SIZE_STEP_PX)}
        className={btn(false)}
      >
        <Plus size={14} />
      </button>

      <Divider />

      {/* Lists + indent */}
      <button
        type="button"
        title="Bullet list"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn(editor.isActive("bulletList"))}
      >
        <List size={14} />
      </button>
      <button
        type="button"
        title="Numbered list"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btn(editor.isActive("orderedList"))}
      >
        <ListOrdered size={14} />
      </button>
      <button
        type="button"
        title="Outdent list item"
        onClick={() => editor.chain().focus().liftListItem("listItem").run()}
        className={btn(false)}
      >
        <IndentDecrease size={14} />
      </button>
      <button
        type="button"
        title="Indent list item"
        onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
        className={btn(false)}
      >
        <IndentIncrease size={14} />
      </button>

      <Divider />

      {/* Alignment */}
      <button
        type="button"
        title="Align left"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        className={btn(editor.isActive({ textAlign: "left" }))}
      >
        <AlignLeft size={14} />
      </button>
      <button
        type="button"
        title="Align center"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        className={btn(editor.isActive({ textAlign: "center" }))}
      >
        <AlignCenter size={14} />
      </button>
      <button
        type="button"
        title="Align right"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        className={btn(editor.isActive({ textAlign: "right" }))}
      >
        <AlignRight size={14} />
      </button>
      <button
        type="button"
        title="Justify"
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        className={btn(editor.isActive({ textAlign: "justify" }))}
      >
        <AlignJustify size={14} />
      </button>

      <Divider />

      {/* Link + unlink */}
      <button
        type="button"
        title="Add link"
        onClick={() => {
          const previous = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("Link URL", previous ?? "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().unsetLink().run();
          } else {
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }
        }}
        className={btn(editor.isActive("link"))}
      >
        <LinkIcon size={14} />
      </button>
      {/* Remove link — always visible. extendMarkRange covers the
          "cursor inside a link" case; unsetLink then strips the link
          mark from the whole selection, so it works even when the
          selection extends past a link into plain text. */}
      <button
        type="button"
        title="Remove link"
        onClick={() =>
          editor.chain().focus().extendMarkRange("link").unsetLink().run()
        }
        className={btn(false)}
      >
        <Link2Off size={14} />
      </button>

      <Divider />

      {/* Color picker — native HTML color input. Tiny, universal, no dep. */}
      <label
        title="Text color"
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-anamaya-charcoal/70 hover:bg-zinc-100 hover:text-anamaya-charcoal"
      >
        <Palette size={14} />
        <input
          type="color"
          value={(editor.getAttributes("textStyle").color as string) || "#444444"}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="sr-only"
        />
      </label>

      {/* Emoji */}
      <div className="relative">
        <button
          type="button"
          title="Insert emoji"
          onClick={() => setShowEmoji((v) => !v)}
          className={btn(showEmoji)}
        >
          <Smile size={14} />
        </button>
        {showEmoji && (
          <EmojiGrid
            onPick={(emoji) => {
              editor.chain().focus().insertContent(emoji).run();
              setShowEmoji(false);
            }}
            onClose={() => setShowEmoji(false)}
          />
        )}
      </div>

      {/* Hard line break — Shift+Enter equivalent. Useful for addresses
          and anywhere a new paragraph would add too much space. */}
      <button
        type="button"
        title="Insert line break (Shift+Enter)"
        onClick={() => editor.chain().focus().setHardBreak().run()}
        className={btn(false)}
      >
        <CornerDownLeft size={14} />
      </button>

      <Divider />

      {/* AI — stubs open a modal that will call the LLM module later */}
      <button
        type="button"
        title="AI rewrite"
        onClick={() => onOpenAi("rewrite")}
        className={btn(false)}
      >
        <Sparkles size={14} />
      </button>
      <button
        type="button"
        title="AI translate"
        onClick={() => onOpenAi("translate")}
        className={btn(false)}
      >
        <Languages size={14} />
      </button>
    </div>
  );
}

/** Parse the current textStyle fontSize into an integer px, defaulting
 *  to 16 if unset or non-px. */
function readFontSizePx(editor: Editor): number {
  const raw = editor.getAttributes("textStyle").fontSize as string | undefined;
  if (!raw) return DEFAULT_FONT_SIZE_PX;
  const m = raw.match(/^(\d+(?:\.\d+)?)px$/);
  return m ? Math.round(Number(m[1])) : DEFAULT_FONT_SIZE_PX;
}

function Divider() {
  return <span className="mx-1 h-5 w-px self-center bg-zinc-200" aria-hidden="true" />;
}

const COMMON_EMOJI = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "🥰", "😘", "😉", "😎",
  "🤩", "🥳", "😇", "🙂", "🙃", "🤗", "🤔", "🙄", "😏", "😅",
  "😴", "🤤", "🤯", "😭", "😤", "😡", "🥺", "😢", "😳", "🙏",
  "💚", "❤️", "🧡", "💛", "💙", "💜", "🤎", "🖤", "🤍", "✨",
  "🌿", "🌱", "🌺", "🌸", "🌴", "🌊", "🌞", "🌙", "🔥", "⭐",
  "✅", "❌", "⚠️", "💡", "📍", "🎉", "🎊", "🎁", "🎯", "🚀",
  "🧘", "🧘‍♀️", "🧘‍♂️", "🕉️", "☸️", "🍃", "🌾", "☀️", "🌈", "💆",
];

function EmojiGrid({
  onPick,
  onClose: _onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute left-0 top-9 z-30 w-64 rounded-md border border-zinc-200 bg-white p-2 shadow-lg">
      <div className="grid grid-cols-10 gap-0.5">
        {COMMON_EMOJI.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onPick(e)}
            className="h-6 w-6 rounded text-base leading-none hover:bg-zinc-100"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
