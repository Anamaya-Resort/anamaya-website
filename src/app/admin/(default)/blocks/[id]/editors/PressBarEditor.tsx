"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { PressBarContent, PressBarLogo } from "@/types/blocks";
import { uploadPressLogo } from "../../actions";
import LivePreview from "@/components/admin/blocks/LivePreview";
import { captureAndUploadBlockSnapshot } from "@/components/admin/blocks/snapshot";
import BrandColorSelect from "@/components/admin/brand/BrandColorSelect";
import BrandFontSelect from "@/components/admin/brand/BrandFontSelect";
import type { OrgBranding } from "@/config/brand-tokens";
import { playClick } from "@/lib/click-sound";

const inputCls =
  "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green";

function emptyLogo(): PressBarLogo {
  return { name: "", src: "", width: 100, height: 30, href: null, featured: false };
}

function normalize(content: PressBarContent | null | undefined): PressBarContent {
  // Back-compat: map the old "teal-muted"/etc. presets to brand-token keys
  // so existing rows render correctly in the new picker.
  const legacy: Record<string, string> = {
    "teal-muted": "brandDivider",
    "cream":      "brandSubtle",
    "white":      "brand",
    "custom":     content?.bg_color_custom ?? "brandDivider",
  };
  const rawBg = content?.bg_color ?? "brandDivider";
  const bg_color = rawBg in legacy ? legacy[rawBg] : rawBg;

  return {
    heading: content?.heading ?? "Recommended by:",
    column_widths_pct: content?.column_widths_pct,
    logos: content?.logos ?? [],
    bg_color,
    heading_color: content?.heading_color ?? "",
    heading_font: content?.heading_font ?? "heading",
    logo_height_px: content?.logo_height_px ?? 48,
    section_height_px: content?.section_height_px ?? 200,
    left_gutter_pct: content?.left_gutter_pct ?? 5,
    right_gutter_pct: content?.right_gutter_pct ?? 5,
    gap_px: content?.gap_px ?? 16,
    heading_size_px: content?.heading_size_px ?? 14,
    heading_gap_px: content?.heading_gap_px ?? 24,
  };
}

export type Variant = {
  id: string;
  name: string;
  slug: string;
  snapshot_url: string | null;
};

const saveIdleCls =
  "rounded-full bg-anamaya-green px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-anamaya-green-dark active:bg-anamaya-brand-btn disabled:opacity-50";
const saveBusyCls =
  "rounded-full bg-anamaya-brand-btn px-6 py-2 text-sm font-semibold uppercase tracking-wider text-white disabled:opacity-70";

/** Tailwind class string for the Save button — terra cotta while saving. */
function saveClass(saving: boolean) {
  return saving ? saveBusyCls : saveIdleCls;
}

export default function PressBarEditor({
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
  content: PressBarContent;
  onSave: (name: string, slug: string, content: unknown) => Promise<void>;
  brandTokens: Required<OrgBranding>;
  variants: Variant[];
  typeName: string;
}) {
  // `draft` is what inputs bind to. `preview` is what the <LivePreview> renders
  // and what gets saved. Text fields write to draft on keystroke, then commit
  // to preview on blur/Enter so the preview doesn't reflow mid-typing.
  // Discrete controls (checkbox, select, upload, reorder, add/remove) update
  // both at once via patch().
  const initial = normalize(content);
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState<PressBarContent>(initial);
  const [preview, setPreview] = useState<PressBarContent>(initial);
  const [saving, setSaving] = useState(false);
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const shortcode = `[#${slug}]`;

  async function copyShortcode() {
    try {
      await navigator.clipboard.writeText(shortcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  function commit() {
    setPreview(draft);
  }

  // Apply the same update to both draft and preview (for discrete controls).
  function patch(update: Partial<PressBarContent>) {
    setDraft((d) => ({ ...d, ...update }));
    setPreview((p) => ({ ...p, ...update }));
  }

  function patchLogos(fn: (arr: PressBarLogo[]) => PressBarLogo[]) {
    setDraft((d) => ({ ...d, logos: fn(d.logos) }));
    setPreview((p) => ({ ...p, logos: fn(p.logos) }));
  }

  // Text-input binding: reads from draft, writes to draft on change, commits
  // to preview on blur/Enter.
  function textFieldProps(
    getter: (d: PressBarContent) => string,
    setter: (d: PressBarContent, v: string) => PressBarContent,
  ) {
    return {
      value: getter(draft),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setDraft((d) => setter(d, v));
      },
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      },
    };
  }

  function updateLogoDraft(i: number, p: Partial<PressBarLogo>) {
    setDraft((d) => ({
      ...d,
      logos: d.logos.map((l, ix) => (ix === i ? { ...l, ...p } : l)),
    }));
  }

  function moveLogo(i: number, delta: number) {
    patchLogos((arr) => {
      const copy = [...arr];
      const j = i + delta;
      if (j < 0 || j >= copy.length) return copy;
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function removeLogo(i: number) {
    patchLogos((arr) => arr.filter((_, ix) => ix !== i));
    setOpenMenuIdx(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Flush any typed-but-not-yet-committed text into the preview so the
      // rendered DOM matches what we're about to save.
      flushSync(() => setPreview(draft));
      // Capture the snapshot *before* onSave — onSave's server action calls
      // redirect(), which throws NEXT_REDIRECT and aborts anything after.
      if (previewRef.current) {
        await captureAndUploadBlockSnapshot(blockId, previewRef.current);
      }
      await onSave(name, slug, draft);
    } finally {
      setSaving(false);
    }
  }

  // When inputs are empty `column_widths_pct` may be [] — omit if length mismatch.
  const previewForRender: PressBarContent = {
    ...preview,
    column_widths_pct:
      preview.column_widths_pct && preview.column_widths_pct.length === preview.logos.length
        ? preview.column_widths_pct
        : undefined,
    heading_color: preview.heading_color || undefined,
  };

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
            placeholder="e.g. press_bar_1"
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

      {preview.logos.length > 0 ? (
        <LivePreview
          ref={previewRef}
          typeSlug="press_bar"
          content={previewForRender}
          currentId={blockId}
          typeName={typeName}
          variants={variants}
        />
      ) : (
        <section className="mb-8">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-anamaya-charcoal/60">
            Live preview
          </h3>
          <div className="flex h-24 items-center justify-center rounded-md bg-zinc-100 text-xs text-anamaya-charcoal/40 ring-1 ring-zinc-200">
            Add a logo to see the preview
          </div>
        </section>
      )}

      <form
        action={handleSave}
        className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-zinc-200"
      >
        <div className="grid grid-cols-1 gap-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
              Heading
            </span>
            <input
              className={inputCls}
              {...textFieldProps(
                (d) => d.heading ?? "",
                (d, v) => ({ ...d, heading: v }),
              )}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
                Heading font
              </span>
              <BrandFontSelect
                value={draft.heading_font}
                onChange={(v) => patch({ heading_font: v })}
              />
            </div>

            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
                Heading color (Auto = contrast-aware)
              </span>
              <BrandColorSelect
                value={draft.heading_color}
                onChange={(v) => patch({ heading_color: v })}
                brandTokens={brandTokens}
                allowAuto
              />
            </div>
          </div>

          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
              Background color
            </span>
            <BrandColorSelect
              value={draft.bg_color}
              onChange={(v) => patch({ bg_color: v })}
              brandTokens={brandTokens}
            />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="block w-40">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
                Logo height (px, featured is 2×)
              </span>
              <input
                type="number"
                min={24}
                max={160}
                className={inputCls}
                value={draft.logo_height_px ?? 48}
                onChange={(e) => {
                  const v = Number(e.target.value) || 48;
                  setDraft((d) => ({ ...d, logo_height_px: v }));
                }}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commit();
                  }
                }}
              />
            </label>
            <label className="block w-40">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
                Section height (px, min)
              </span>
              <input
                type="number"
                min={80}
                max={600}
                className={inputCls}
                value={draft.section_height_px ?? 200}
                onChange={(e) => {
                  const v = Number(e.target.value) || 200;
                  setDraft((d) => ({ ...d, section_height_px: v }));
                }}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commit();
                  }
                }}
              />
            </label>
            <label className="block w-40">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
                Heading size (px)
              </span>
              <input
                type="number"
                min={8}
                max={96}
                className={inputCls}
                value={draft.heading_size_px ?? 14}
                onChange={(e) => {
                  const v = Number(e.target.value) || 14;
                  setDraft((d) => ({ ...d, heading_size_px: v }));
                }}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commit();
                  }
                }}
              />
            </label>
            <label className="block w-40">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
                Heading → logos gap (px)
              </span>
              <input
                type="number"
                min={0}
                max={200}
                className={inputCls}
                value={draft.heading_gap_px ?? 24}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setDraft((d) => ({
                    ...d,
                    heading_gap_px: Number.isFinite(v) ? v : 24,
                  }));
                }}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commit();
                  }
                }}
              />
            </label>
            {/* Duplicate of the bottom Save, placed up here for quick
                commits while editing colors/fonts without scrolling. */}
            <button
              type="submit"
              disabled={saving}
              onClick={playClick}
              className={`${saveClass(saving)} ml-auto`}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
              Left gutter (weight, default 5)
            </span>
            <input
              type="number"
              min={0}
              max={100}
              className={inputCls}
              value={draft.left_gutter_pct ?? 5}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDraft((d) => ({ ...d, left_gutter_pct: Number.isFinite(v) ? v : 5 }));
              }}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
              }}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
              Right gutter (weight, default 5)
            </span>
            <input
              type="number"
              min={0}
              max={100}
              className={inputCls}
              value={draft.right_gutter_pct ?? 5}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDraft((d) => ({ ...d, right_gutter_pct: Number.isFinite(v) ? v : 5 }));
              }}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
              }}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
              Gap between logos (px)
            </span>
            <input
              type="number"
              min={0}
              max={200}
              className={inputCls}
              value={draft.gap_px ?? 16}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDraft((d) => ({ ...d, gap_px: Number.isFinite(v) ? v : 16 }));
              }}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
              }}
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-anamaya-charcoal/70">
            Per-logo column weights (comma-separated, fr units)
          </span>
          <input
            className={inputCls}
            placeholder="e.g. 1,1,1,1,2,1,1,1,1"
            value={(draft.column_widths_pct ?? []).join(",")}
            onChange={(e) => {
              const parts = e.target.value
                .split(",")
                .map((s) => Number(s.trim()))
                .filter((n) => Number.isFinite(n));
              setDraft((d) => ({ ...d, column_widths_pct: parts }));
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
          />
          <span className="mt-1 block text-[10px] text-anamaya-charcoal/50">
            Leave blank for default weights (1 per logo, 2 for featured). Numbers don&apos;t need to sum to 100 — they&apos;re fr-unit weights.
          </span>
        </label>

        {uploadError && (
          <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {uploadError}
          </div>
        )}

        <section className="mt-6">
          <header className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold uppercase tracking-wider text-anamaya-charcoal">
              Logos ({draft.logos.length})
            </h3>
            <button
              type="button"
              onClick={() => patchLogos((a) => [...a, emptyLogo()])}
              className="rounded-full bg-anamaya-olive-dark px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white hover:opacity-90"
            >
              + Add logo
            </button>
          </header>

          <div className="space-y-3">
            {draft.logos.map((logo, i) => (
              <div
                key={i}
                className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-md bg-zinc-50 p-3 ring-1 ring-zinc-200"
              >
                <LogoThumb
                  logo={logo}
                  isUploading={uploadingIdx === i}
                  isOpen={openMenuIdx === i}
                  onOpen={() => setOpenMenuIdx(i)}
                  onClose={() => setOpenMenuIdx(null)}
                  onDelete={() => removeLogo(i)}
                  onUploaded={(u) => {
                    // Upload is a discrete action — push to preview immediately.
                    patchLogos((arr) =>
                      arr.map((l, ix) =>
                        ix === i ? { ...l, src: u.url, width: u.width, height: u.height } : l,
                      ),
                    );
                    setOpenMenuIdx(null);
                  }}
                  onUploadStart={() => {
                    setUploadError(null);
                    setUploadingIdx(i);
                  }}
                  onUploadError={(msg) => setUploadError(msg)}
                  onUploadEnd={() => setUploadingIdx(null)}
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    className={inputCls}
                    placeholder="Name"
                    value={logo.name}
                    onChange={(e) => updateLogoDraft(i, { name: e.target.value })}
                    onBlur={commit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commit();
                      }
                    }}
                  />
                  <input
                    className={inputCls}
                    placeholder="Image URL (/press/…)"
                    value={logo.src}
                    onChange={(e) => updateLogoDraft(i, { src: e.target.value })}
                    onBlur={commit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commit();
                      }
                    }}
                  />
                  <input
                    className={inputCls}
                    placeholder="Article URL (blank = no link)"
                    value={logo.href ?? ""}
                    onChange={(e) => updateLogoDraft(i, { href: e.target.value || null })}
                    onBlur={commit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commit();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-anamaya-charcoal/70">
                      <input
                        type="checkbox"
                        checked={!!logo.featured}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          patchLogos((arr) =>
                            arr.map((l, ix) => (ix === i ? { ...l, featured: checked } : l)),
                          );
                        }}
                      />
                      featured (2× height)
                    </label>
                    <div className="flex items-center gap-1 text-xs text-anamaya-charcoal/70">
                      <span className="mr-1 uppercase tracking-wider">Size</span>
                      <button
                        type="button"
                        onClick={() => {
                          patchLogos((arr) =>
                            arr.map((l, ix) =>
                              ix === i
                                ? { ...l, size_adjust_pct: (l.size_adjust_pct ?? 0) - 5 }
                                : l,
                            ),
                          );
                        }}
                        className="rounded bg-white px-2 py-1 ring-1 ring-zinc-300 hover:bg-zinc-100"
                        aria-label="Shrink this logo 5%"
                      >
                        −5%
                      </button>
                      <span className="min-w-[3.5rem] text-center font-mono">
                        {(logo.size_adjust_pct ?? 0) >= 0 ? "+" : ""}
                        {logo.size_adjust_pct ?? 0}%
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          patchLogos((arr) =>
                            arr.map((l, ix) =>
                              ix === i
                                ? { ...l, size_adjust_pct: (l.size_adjust_pct ?? 0) + 5 }
                                : l,
                            ),
                          );
                        }}
                        className="rounded bg-white px-2 py-1 ring-1 ring-zinc-300 hover:bg-zinc-100"
                        aria-label="Grow this logo 5%"
                      >
                        +5%
                      </button>
                      {(logo.size_adjust_pct ?? 0) !== 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            patchLogos((arr) =>
                              arr.map((l, ix) =>
                                ix === i ? { ...l, size_adjust_pct: 0 } : l,
                              ),
                            );
                          }}
                          className="ml-1 rounded px-1.5 py-1 text-anamaya-charcoal/50 hover:bg-zinc-100 hover:text-anamaya-charcoal"
                          aria-label="Reset size to 0%"
                          title="Reset"
                        >
                          ↺
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => moveLogo(i, -1)}
                    className="rounded bg-white px-2 py-1 text-xs ring-1 ring-zinc-300 hover:bg-zinc-100"
                    disabled={i === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLogo(i, +1)}
                    className="rounded bg-white px-2 py-1 text-xs ring-1 ring-zinc-300 hover:bg-zinc-100"
                    disabled={i === draft.logos.length - 1}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={saving} onClick={playClick} className={saveClass(saving)}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </>
  );
}

function LogoThumb({
  logo,
  isOpen,
  isUploading,
  onOpen,
  onClose,
  onDelete,
  onUploaded,
  onUploadStart,
  onUploadError,
  onUploadEnd,
}: {
  logo: PressBarLogo;
  isOpen: boolean;
  isUploading: boolean;
  onOpen: () => void;
  onClose: () => void;
  onDelete: () => void;
  onUploaded: (u: { url: string; width: number; height: number }) => void;
  onUploadStart: () => void;
  onUploadError: (msg: string) => void;
  onUploadEnd: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  async function handlePicked(file: File) {
    onUploadStart();
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadPressLogo(fd);
      onUploaded(result);
    } catch (e) {
      onUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      onUploadEnd();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (isOpen ? onClose() : onOpen())}
        className="relative block h-[88px] w-36 shrink-0 overflow-hidden rounded ring-1 ring-zinc-200 transition-all hover:ring-anamaya-green disabled:opacity-50"
        style={{
          backgroundColor: "#a3a3a3",
          backgroundImage:
            "linear-gradient(45deg, #737373 25%, transparent 25%), linear-gradient(-45deg, #737373 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #737373 75%), linear-gradient(-45deg, transparent 75%, #737373 75%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
        }}
        disabled={isUploading}
        aria-label="Edit logo image"
      >
        {logo.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo.src} alt="" className="h-full w-full object-contain p-1" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-white/70 text-[10px] uppercase text-anamaya-charcoal/60">
            No image
          </span>
        )}
        {isUploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/80 text-[10px] font-semibold text-anamaya-charcoal">
            Uploading…
          </span>
        )}
      </button>

      {isOpen && !isUploading && (
        <div
          role="menu"
          className="absolute left-0 top-14 z-20 flex flex-col overflow-hidden rounded-md bg-white text-xs font-semibold shadow-lg ring-1 ring-zinc-200"
        >
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="whitespace-nowrap px-3 py-2 text-left uppercase tracking-wider text-anamaya-charcoal hover:bg-anamaya-green hover:text-white"
          >
            Upload New
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="whitespace-nowrap border-t border-zinc-100 px-3 py-2 text-left uppercase tracking-wider text-red-600 hover:bg-red-600 hover:text-white"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onClose}
            className="whitespace-nowrap border-t border-zinc-100 px-3 py-2 text-left uppercase tracking-wider text-anamaya-charcoal/70 hover:bg-zinc-100"
          >
            Cancel
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) handlePicked(f);
        }}
      />
    </div>
  );
}
