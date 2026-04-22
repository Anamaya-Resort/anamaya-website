"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { toBlob } from "html-to-image";
import type { HeroBandContent, HeroContent } from "@/types/blocks";
import { uploadBlockSnapshot, uploadHeroVideo } from "../../actions";
import LivePreview from "@/components/admin/blocks/LivePreview";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import BrandFontSelect from "@/components/admin/brand/BrandFontSelect";
import type { OrgBranding } from "@/config/brand-tokens";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";

const saveButtonCls =
  "rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white hover:bg-anamaya-green-dark disabled:opacity-50";

type Variant = { id: string; name: string; slug: string; snapshot_url: string | null };

function defaultBand(): HeroBandContent {
  return {
    enabled: false,
    height_px: 100,
    bg_color: "brandSubtle",
    text: "",
    text_font: "heading",
    text_size_px: 24,
    text_bold: false,
    text_italic: false,
    text_color: "",
  };
}

function normalize(content: HeroContent | null | undefined): HeroContent {
  return {
    video_source: content?.video_source ?? "youtube",
    youtube_url: content?.youtube_url ?? "",
    video_url: content?.video_url ?? "",
    video_poster_url: content?.video_poster_url ?? "",
    top: { ...defaultBand(), ...(content?.top ?? {}) },
    bottom: { ...defaultBand(), ...(content?.bottom ?? {}) },
  };
}

export default function HeroEditor({
  blockId,
  name: initialName,
  slug: initialSlug,
  content,
  onSave,
  brandTokens,
  variants,
  typeName,
}: {
  blockId: string;
  name: string;
  slug: string;
  content: HeroContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: Variant[];
  typeName: string;
}) {
  const initial = normalize(content);
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState<HeroContent>(initial);
  const [preview, setPreview] = useState<HeroContent>(initial);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const shortcode = `[#${slug}]`;

  function commit() {
    setPreview(draft);
  }
  function patch(update: Partial<HeroContent>) {
    setDraft((d) => ({ ...d, ...update }));
    setPreview((p) => ({ ...p, ...update }));
  }
  function patchBand(which: "top" | "bottom", update: Partial<HeroBandContent>) {
    setDraft((d) => ({ ...d, [which]: { ...d[which], ...update } }));
    setPreview((p) => ({ ...p, [which]: { ...p[which], ...update } }));
  }
  function textBandProps(
    which: "top" | "bottom",
    key: keyof HeroBandContent,
  ) {
    return {
      value: ((draft[which] as HeroBandContent | undefined)?.[key] as string | undefined) ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const v = e.target.value;
        setDraft((d) => ({ ...d, [which]: { ...d[which], [key]: v } }));
      },
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement).tagName !== "TEXTAREA") {
          e.preventDefault();
          commit();
        }
      },
    };
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

  async function pickVideo(file: File) {
    setUploadError(null);
    setUploadingVideo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { url } = await uploadHeroVideo(fd);
      patch({ video_url: url, video_source: "upload" });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadingVideo(false);
    }
  }

  async function captureAndUploadSnapshot() {
    const node = previewRef.current;
    if (!node) return;
    try {
      const blob = await toBlob(node, { pixelRatio: 1, cacheBust: true, backgroundColor: "#ffffff" });
      if (!blob) return;
      const fd = new FormData();
      fd.append("file", new File([blob], `snap-${blockId}.png`, { type: "image/png" }));
      await uploadBlockSnapshot(blockId, fd);
    } catch (e) {
      console.warn("snapshot capture failed:", e);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      flushSync(() => setPreview(draft));
      await captureAndUploadSnapshot();
      await onSave(name, slug, draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
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
                s
                  .trim()
                  .replace(/\s+/g, "_")
                  .replace(/[^a-z0-9_-]/gi, "")
                  .toLowerCase(),
              )
            }
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-mono text-sm text-anamaya-charcoal focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
            placeholder="e.g. hero_1"
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
        typeSlug="hero"
        content={preview}
        currentId={blockId}
        typeName={typeName}
        variants={variants}
      />

      <form action={handleSave} className="space-y-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        {/* ─── Video ─────────────────────────────────────────────── */}
        <section>
          <header className="mb-3 flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
              Video
            </h3>
            <button type="submit" disabled={saving} className={saveButtonCls}>
              {saving ? "Saving…" : "Save"}
            </button>
          </header>

          <div className="mb-3 inline-flex rounded-md border border-zinc-300 bg-white p-0.5 text-[11px] font-semibold uppercase tracking-wider">
            {(["youtube", "upload"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => patch({ video_source: s })}
                className={`rounded-sm px-3 py-1 transition-colors ${
                  draft.video_source === s
                    ? "bg-anamaya-charcoal text-white"
                    : "text-anamaya-charcoal/60 hover:text-anamaya-charcoal"
                }`}
              >
                {s === "youtube" ? "YouTube" : "Upload"}
              </button>
            ))}
          </div>

          {draft.video_source === "youtube" ? (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
                YouTube URL or video ID
              </span>
              <input
                className={inputCls}
                value={draft.youtube_url ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, youtube_url: e.target.value }))}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commit();
                  }
                }}
                placeholder="https://youtu.be/dQw4w9WgXcQ or dQw4w9WgXcQ"
              />
            </label>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => videoFileRef.current?.click()}
                  disabled={uploadingVideo}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal hover:bg-zinc-50 disabled:opacity-50"
                >
                  {uploadingVideo ? "Uploading…" : draft.video_url ? "Replace video" : "Upload video"}
                </button>
                {draft.video_url && (
                  <code className="truncate font-mono text-[11px] text-anamaya-charcoal/60">
                    {draft.video_url}
                  </code>
                )}
              </div>
              <input
                ref={videoFileRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) pickVideo(f);
                }}
              />
            </div>
          )}

          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
              Poster image URL (optional)
            </span>
            <input
              className={inputCls}
              value={draft.video_poster_url ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, video_poster_url: e.target.value }))}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
              }}
              placeholder="/images/hero-poster.webp"
            />
          </label>

          {uploadError && (
            <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {uploadError}
            </div>
          )}
        </section>

        {/* ─── Top band ─────────────────────────────────────────── */}
        <BandEditor
          title="Top band"
          band={draft.top ?? defaultBand()}
          onPatch={(u) => patchBand("top", u)}
          onTextCommit={commit}
          textProps={(key) => textBandProps("top", key)}
          brandTokens={brandTokens}
        />

        {/* ─── Bottom band ──────────────────────────────────────── */}
        <BandEditor
          title="Bottom band"
          band={draft.bottom ?? defaultBand()}
          onPatch={(u) => patchBand("bottom", u)}
          onTextCommit={commit}
          textProps={(key) => textBandProps("bottom", key)}
          brandTokens={brandTokens}
        />

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className={saveButtonCls}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </>
  );
}

function BandEditor({
  title,
  band,
  onPatch,
  onTextCommit,
  textProps,
  brandTokens,
}: {
  title: string;
  band: HeroBandContent;
  onPatch: (u: Partial<HeroBandContent>) => void;
  onTextCommit: () => void;
  textProps: (key: keyof HeroBandContent) => {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onBlur: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  };
  brandTokens: Required<OrgBranding>;
}) {
  return (
    <section className="rounded-md border border-zinc-200 p-4">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
          {title}
        </h3>
        <label className="flex items-center gap-2 text-xs text-anamaya-charcoal/70">
          <input
            type="checkbox"
            checked={!!band.enabled}
            onChange={(e) => onPatch({ enabled: e.target.checked })}
          />
          Enabled
        </label>
      </header>

      {band.enabled && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-4">
            <label className="block w-40">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
                Height (px, min)
              </span>
              <input
                type="number"
                min={0}
                max={600}
                className={inputCls}
                value={band.height_px ?? 100}
                onChange={(e) => onPatch({ height_px: Number(e.target.value) || 0 })}
                onBlur={onTextCommit}
              />
            </label>
            <div className="flex-1 min-w-[280px]">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
                Background color
              </span>
              <BrandColorSelect
                value={band.bg_color}
                onChange={(v) => onPatch({ bg_color: v })}
                brandTokens={brandTokens}
                allowAuto
              />
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
              Text
            </span>
            <textarea
              rows={3}
              className={inputCls}
              placeholder="Leave blank for a decorative band"
              {...textProps("text")}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
                Text font
              </span>
              <BrandFontSelect
                value={band.text_font}
                onChange={(v) => onPatch({ text_font: v })}
              />
            </div>
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
                Text color
              </span>
              <BrandColorSelect
                value={band.text_color}
                onChange={(v) => onPatch({ text_color: v })}
                brandTokens={brandTokens}
                allowAuto
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="block w-32">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
                Size (px)
              </span>
              <input
                type="number"
                min={10}
                max={200}
                className={inputCls}
                value={band.text_size_px ?? 24}
                onChange={(e) => onPatch({ text_size_px: Number(e.target.value) || 24 })}
                onBlur={onTextCommit}
              />
            </label>
            <div className="flex gap-1">
              <StyleToggle label="B" pressed={!!band.text_bold} onClick={() => onPatch({ text_bold: !band.text_bold })} bold />
              <StyleToggle label="I" pressed={!!band.text_italic} onClick={() => onPatch({ text_italic: !band.text_italic })} italic />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StyleToggle({
  label,
  pressed,
  onClick,
  bold,
  italic,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`flex h-9 w-9 items-center justify-center rounded border text-sm transition-colors ${
        pressed
          ? "border-anamaya-green bg-anamaya-green/10 text-anamaya-charcoal"
          : "border-zinc-300 bg-white text-anamaya-charcoal/70 hover:bg-zinc-50"
      } ${bold ? "font-bold" : ""} ${italic ? "italic" : ""}`}
    >
      {label}
    </button>
  );
}
