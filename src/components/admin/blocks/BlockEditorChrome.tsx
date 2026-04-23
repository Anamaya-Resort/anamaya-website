"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import LivePreview from "@/components/admin/blocks/LivePreview";
import { captureAndUploadBlockSnapshot } from "@/components/admin/blocks/snapshot";
import { playClick } from "@/lib/click-sound";
import type { BlockTypeSlug } from "@/types/blocks";
import type { OrgBranding } from "@/config/brand-tokens";

export type BlockEditorVariant = {
  id: string;
  name: string;
  slug: string;
  snapshot_url: string | null;
};

export type BlockEditorState<T> = {
  draft: T;
  setDraft: (v: T | ((prev: T) => T)) => void;
  preview: T;
  commit: () => void;
  patch: (update: Partial<T>) => void;
  brandTokens: Required<OrgBranding>;
  /** True while handleSave is in flight. Useful for editors that want
   *  to render an additional Save button inline with their own form. */
  saving: boolean;
};

const saveIdleCls =
  "rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark active:bg-anamaya-brand-btn disabled:opacity-50";
const saveBusyCls =
  "rounded-full bg-anamaya-brand-btn px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-70";

/**
 * Reusable Save submit-button. Editors can drop additional <SaveButton>s
 * in their form to match the main one at the bottom — they all submit
 * the same <form action={handleSave}>, so clicking any of them triggers
 * the same save flow, and the shared `saving` state keeps them in sync.
 */
export function SaveButton({
  saving,
  className = "",
}: {
  saving: boolean;
  className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={saving}
      onClick={playClick}
      className={`${saving ? saveBusyCls : saveIdleCls} ${className}`}
    >
      {saving ? "Saving…" : "Save"}
    </button>
  );
}

/**
 * Shared chrome for block editors — name/slug/shortcode header, live preview
 * with variant carousel, snapshot capture, and the save button states.
 * Editors only provide a `normalize` function + `renderForm`.
 */
export default function BlockEditorChrome<T>({
  blockId,
  typeSlug,
  typeName,
  name: initialName,
  slug: initialSlug,
  content,
  normalize,
  onSave,
  brandTokens,
  variants,
  renderForm,
}: {
  blockId: string;
  typeSlug: BlockTypeSlug;
  typeName: string;
  name: string;
  slug: string;
  content: T;
  normalize: (c: T | null | undefined) => T;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: BlockEditorVariant[];
  renderForm: (state: BlockEditorState<T>) => React.ReactNode;
}) {
  const normalized = normalize(content);
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [draft, setDraft] = useState<T>(normalized);
  const [preview, setPreview] = useState<T>(normalized);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const shortcode = `[#${slug}]`;

  function commit() {
    setPreview(draft);
  }
  function patch(update: Partial<T>) {
    setDraft((d) => ({ ...(d as object), ...update } as T));
    setPreview((p) => ({ ...(p as object), ...update } as T));
  }

  async function copyShortcode() {
    try {
      await navigator.clipboard.writeText(shortcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      flushSync(() => setPreview(draft));
      if (previewRef.current) {
        await captureAndUploadBlockSnapshot(blockId, previewRef.current);
      }
      await onSave(name, slug, draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Name + Slug + Shortcode header */}
      <div className="mb-5 grid gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-anamaya-charcoal/60">
            Display name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-lg font-semibold text-anamaya-charcoal focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
            placeholder="Untitled block"
          />
        </label>
        <div className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-anamaya-charcoal/60">
            Block name (slug)
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onBlur={() =>
              setSlug((s) =>
                s.trim().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/gi, "").toLowerCase(),
              )
            }
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-mono text-sm text-anamaya-charcoal focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
            placeholder={`e.g. ${typeSlug}_1`}
          />
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-anamaya-charcoal">
              {shortcode}
            </code>
            <button
              type="button"
              onClick={copyShortcode}
              className="rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-50"
            >
              {copied ? "Copied!" : "Copy Shortcode"}
            </button>
          </div>
        </div>
      </div>

      <LivePreview
        ref={previewRef}
        typeSlug={typeSlug}
        content={preview}
        currentId={blockId}
        typeName={typeName}
        variants={variants}
      />

      <form
        action={handleSave}
        className="space-y-4 rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200"
      >
        {renderForm({ draft, setDraft, preview, commit, patch, brandTokens, saving })}
        <div className="mt-6 flex justify-end">
          <SaveButton saving={saving} />
        </div>
      </form>
    </>
  );
}
