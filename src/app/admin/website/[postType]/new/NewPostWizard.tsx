"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createItem } from "./actions";
import { buildPreview, bindTemplate } from "./preview-actions";
import { uploadWizardMedia } from "./upload-actions";

export type WizardTemplate = {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
};

// Sentinel for the "None (rich-text fallback)" choice — a real, empty
// cms_template_id. Kept distinct from a template's UUID so it can live in the
// same selected-set without colliding.
const NONE_ID = "__none__";

// --- Snapshot geometry -----------------------------------------------------
// Each template card shows a scaled-down LIVE preview that reads as a faithful
// miniature of the WHOLE page on a laptop, not a tall top-crop of the hero.
// We render the preview iframe at a real laptop width (LAPTOP_W) so it shows
// the true desktop layout, then CSS-scale the whole thing down by
// scale = CARD_W / LAPTOP_W. Because the iframe and /preview/template are
// same-origin, on load we read the iframe's real content height and size the
// card proportionally (capped at MAX_LOGICAL so very long pages don't produce
// absurdly tall cards). See TemplateMini below.
const LAPTOP_W = 1280; // logical laptop viewport the preview renders at
const CARD_W = 300; // visible card/snapshot width in px; scale = CARD_W / LAPTOP_W ≈ 0.2344
// Cap on the logical page height we actually show. Enough to reveal hero +
// body + a couple of sections so templates look DIFFERENT, without letting a
// very long page make a skyscraper card.
const MAX_LOGICAL = 2600;
// Fallback logical height when the same-origin height read fails or returns 0.
const DEFAULT_LOGICAL = 2400;

// --- Shared template miniature ---------------------------------------------
// Renders /preview/template/... in an iframe at LAPTOP_W and CSS-scales the
// whole thing to CARD_W, so the card is a proportional whole-page miniature of
// the laptop layout. Each mini measures its own content height on load (the
// iframe is same-origin), so multiple minis on one page size independently and
// nothing blocks render on measurement. Used by both the Step-1 picker cards
// and the Phase-2 preview strip.
function TemplateMini({
  src,
  title,
  cardW = CARD_W,
}: {
  src: string;
  title: string;
  cardW?: number;
}) {
  // Real content height of the iframe once loaded; null until measured.
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const scale = cardW / LAPTOP_W;
  // Ask the preview to cap its cover hero (?thumb=1) so the whole page fits
  // the mini at a normal scale instead of the hero ballooning via vh.
  const thumbSrc = src + (src.includes("?") ? "&" : "?") + "thumb=1";
  // Logical (unscaled) height we actually render/clip to. Capped so long pages
  // don't create skyscraper cards; falls back before measurement.
  const logical = Math.min(contentHeight ?? DEFAULT_LOGICAL, MAX_LOGICAL);
  const measured = contentHeight != null;
  // Before measurement, reserve a neutral placeholder height so layout doesn't
  // jump around while the iframe loads. After, use the true scaled height.
  const cardHeight = measured
    ? Math.round(logical * scale)
    : Math.round(cardW * 1.3);
  // Page is taller than what we show → hint there's more with a bottom fade.
  const overflow = contentHeight != null && contentHeight > MAX_LOGICAL;

  function readHeight(): number {
    try {
      return frameRef.current?.contentDocument?.documentElement?.scrollHeight ?? 0;
    } catch {
      return 0;
    }
  }

  function handleLoad() {
    const h = readHeight();
    setContentHeight(h > 0 ? h : DEFAULT_LOGICAL);
    // The preview lazy-loads images, so the page keeps growing after `load`
    // fires. Watch the same-origin document for size changes and re-measure;
    // also re-read a couple of times as a fallback where RO is unavailable.
    try {
      const doc = frameRef.current?.contentDocument;
      if (doc?.documentElement && "ResizeObserver" in window) {
        roRef.current?.disconnect();
        const ro = new ResizeObserver(() => {
          const h2 = readHeight();
          if (h2 > 0) setContentHeight(h2);
        });
        ro.observe(doc.documentElement);
        roRef.current = ro;
      }
    } catch {
      /* cross-origin — keep the load-time measurement */
    }
    [800, 2000].forEach((d) =>
      setTimeout(() => {
        const h3 = readHeight();
        if (h3 > 0) setContentHeight(h3);
      }, d),
    );
  }

  useEffect(() => () => roRef.current?.disconnect(), []);

  return (
    <div
      style={{ width: cardW, height: cardHeight }}
      className="relative overflow-hidden bg-white"
    >
      <div
        style={{
          width: LAPTOP_W,
          height: logical,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <iframe
          ref={frameRef}
          src={thumbSrc}
          title={title}
          loading="lazy"
          tabIndex={-1}
          onLoad={handleLoad}
          style={{
            width: LAPTOP_W,
            height: logical,
            border: "0",
            pointerEvents: "none",
          }}
        />
      </div>
      {overflow && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))",
          }}
        />
      )}
    </div>
  );
}

type MediaItem = {
  // Stable client-side key; media is NOT persisted to the DB in Phase 1.
  localId: string;
  name: string;
  status: "uploading" | "done" | "error";
  url?: string;
  kind?: "image" | "video";
  error?: string;
};

let mediaCounter = 0;
function nextLocalId() {
  mediaCounter += 1;
  return `m${mediaCounter}-${Date.now()}`;
}

export default function NewPostWizard({
  postTypeSlug,
  postTypeLabel,
  pluralLabel,
  templates,
}: {
  postTypeSlug: string;
  postTypeLabel: string;
  pluralLabel: string;
  templates: WizardTemplate[];
}) {
  // Pre-check the type's default template; fall back to None if it has none.
  const defaultTemplate = templates.find((t) => t.isDefault);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(
    defaultTemplate ? [defaultTemplate.id] : [NONE_ID],
  );

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isCreating, startCreate] = useTransition();
  const [pasteOpen, setPasteOpen] = useState(false);

  // --- Preview step ---------------------------------------------------------
  // `step` drives which view shows. Step 1 ("edit") state above is preserved
  // when we switch to "preview", so Back returns without losing anything.
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isBuilding, startBuild] = useTransition();
  const [buildError, setBuildError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function toggleTemplate(id: string) {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  // The first real (non-None) template, in list order, for the create action.
  // Empty string => None / rich-text fallback.
  function firstSelectedTemplateId(): string {
    for (const t of templates) {
      if (selectedTemplateIds.includes(t.id)) return t.id;
    }
    return "";
  }

  // --- Media upload (shared by file input + clipboard paste) ---------------
  async function uploadOne(file: File) {
    const localId = nextLocalId();
    setMedia((prev) => [
      ...prev,
      { localId, name: file.name || "pasted-file", status: "uploading" },
    ]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { url, kind } = await uploadWizardMedia(fd);
      setMedia((prev) =>
        prev.map((m) =>
          m.localId === localId ? { ...m, status: "done", url, kind } : m,
        ),
      );
    } catch (err) {
      setMedia((prev) =>
        prev.map((m) =>
          m.localId === localId
            ? {
                ...m,
                status: "error",
                error: err instanceof Error ? err.message : "Upload failed",
              }
            : m,
        ),
      );
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) uploadOne(file);
  }

  function removeMedia(localId: string) {
    setMedia((prev) => prev.filter((m) => m.localId !== localId));
  }

  // --- Create draft & open editor (preserves today's create flow) ----------
  function handleCreate() {
    startCreate(async () => {
      const fd = new FormData();
      fd.append("postTypeSlug", postTypeSlug);
      fd.append("title", title);
      fd.append("body", body);
      fd.append("cms_template_id", firstSelectedTemplateId());
      // createItem inserts the draft, saves the body, then redirects to the
      // editor. The redirect propagates out of the server action.
      await createItem(fd);
    });
  }

  const canCreate = title.trim().length > 0 && !isCreating;

  // The selected REAL templates, in list order — the ones the preview strip
  // renders. The "None" sentinel has no template to render, so it's omitted.
  const previewTemplates = templates.filter((t) =>
    selectedTemplateIds.includes(t.id),
  );

  // Continue → build a preview draft (persist body + per-template overrides),
  // then switch to the preview view. Needs a title and at least one real
  // template so the strip is never empty.
  const canContinue =
    title.trim().length > 0 && previewTemplates.length > 0 && !isBuilding;

  function handleContinue() {
    setBuildError(null);
    startBuild(async () => {
      try {
        const images = media
          .filter((m) => m.status === "done" && m.kind === "image" && m.url)
          .map((m) => m.url as string);
        const { draftId: id } = await buildPreview({
          postTypeSlug,
          title,
          body,
          images,
          selectedTemplateIds,
          draftId: draftId ?? undefined,
        });
        setDraftId(id);
        setStep("preview");
      } catch (err) {
        setBuildError(
          err instanceof Error ? err.message : "Could not build preview",
        );
      }
    });
  }

  // --- Preview view ---------------------------------------------------------
  if (step === "preview" && draftId) {
    return (
      <PreviewStep
        postTypeSlug={postTypeSlug}
        draftId={draftId}
        templates={previewTemplates}
        onBack={() => setStep("edit")}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-3">
      {/* STEP 1 — Choose templates + content */}

      {/* Choose templates (multi-select snapshots) */}
      <div className="rounded-sm border border-[#c3c4c7] bg-white">
        <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
          Choose templates
          <span className="ml-2 text-[12px] font-normal text-[#50575e]">
            Pick one or more layouts to preview this{" "}
            {postTypeLabel.toLowerCase()} in. You can change it later.
          </span>
        </div>
        <div className="flex flex-wrap gap-4 px-3 py-4">
          {/* None — rich-text fallback (no iframe, simple placeholder) */}
          <TemplateCard
            selected={selectedTemplateIds.includes(NONE_ID)}
            onToggle={() => toggleTemplate(NONE_ID)}
            name="None (rich-text fallback)"
            sub="Renders from the body HTML"
          >
            <div
              style={{ width: CARD_W, height: Math.round(CARD_W * 1.3) }}
              className="flex flex-col items-center justify-center gap-1 bg-[#f6f7f7] px-3 text-center"
            >
              <span className="text-[22px] leading-none text-[#a7aaad]">
                ¶
              </span>
              <span className="text-[11px] text-[#50575e]">
                No template — rich text only
              </span>
            </div>
          </TemplateCard>

          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              selected={selectedTemplateIds.includes(t.id)}
              onToggle={() => toggleTemplate(t.id)}
              name={t.name}
              sub={`${t.slug}${t.isDefault ? " · default" : ""}`}
              mono
            >
              <TemplateMini
                src={`/preview/template/${t.id}`}
                title={`${t.name} preview`}
              />
            </TemplateCard>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="rounded-sm border border-[#c3c4c7] bg-white">
        <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
          Content
        </div>
        <div className="space-y-4 px-3 py-3">
          {/* Title */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#1d2327]">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Add ${postTypeLabel.toLowerCase()} title`}
              aria-label="Title"
              autoFocus
              className="w-full rounded-sm border border-[#8c8f94] bg-white px-3 py-2 text-[20px] focus:border-[#2271b1] focus:outline-none"
            />
          </div>

          {/* Body */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#1d2327]">
              Body
              <span className="ml-2 font-normal text-[#50575e]">
                Paste plain text or HTML / blocks.
              </span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Paste your content here…"
              className="w-full rounded-sm border border-[#8c8f94] bg-white px-3 py-2 font-mono text-[13px] focus:border-[#2271b1] focus:outline-none"
            />
          </div>

          {/* Media */}
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#1d2327]">
              Media
              <span className="ml-2 font-normal text-[#50575e]">
                Add images / videos — choose files or paste from the clipboard.
              </span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => {
                handleFiles(e.target.files);
                // Reset so re-selecting the same file re-triggers onChange.
                e.target.value = "";
              }}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-sm border border-[#2271b1] bg-white px-3 py-1.5 text-[13px] text-[#2271b1] hover:bg-[#f6fbfd]"
              >
                Add images / videos
              </button>
              <button
                type="button"
                onClick={() => setPasteOpen(true)}
                className="rounded-sm border border-[#2271b1] bg-white px-3 py-1.5 text-[13px] text-[#2271b1] hover:bg-[#f6fbfd]"
              >
                Paste from clipboard
              </button>
            </div>

            {media.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {media.map((m) => (
                  <div
                    key={m.localId}
                    className="relative w-[120px] rounded-sm border border-[#dcdcde] bg-[#f6f7f7] p-1"
                  >
                    <button
                      type="button"
                      onClick={() => removeMedia(m.localId)}
                      aria-label="Remove"
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-[#c3c4c7] bg-white text-[12px] leading-none text-[#50575e] hover:text-[#d63638]"
                    >
                      ×
                    </button>

                    {m.status === "uploading" && (
                      <div className="flex h-[80px] items-center justify-center text-[12px] text-[#50575e]">
                        <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#c3c4c7] border-t-[#2271b1]" />
                        Uploading…
                      </div>
                    )}

                    {m.status === "done" && m.kind === "image" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.url}
                        alt={m.name}
                        className="h-[80px] w-full rounded-sm object-cover"
                      />
                    )}

                    {m.status === "done" && m.kind === "video" && (
                      <div className="flex h-[80px] items-center justify-center rounded-sm bg-[#1d2327] text-[12px] text-white">
                        ▶ video
                      </div>
                    )}

                    {m.status === "error" && (
                      <div className="flex h-[80px] items-center justify-center px-1 text-center text-[11px] text-[#d63638]">
                        {m.error ?? "Upload failed"}
                      </div>
                    )}

                    <div
                      className="mt-1 truncate text-[11px] text-[#50575e]"
                      title={m.name}
                    >
                      {m.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/website/${postTypeSlug}`}
          className="text-[13px] text-[#2271b1] hover:underline"
        >
          ← Back to all {pluralLabel.toLowerCase()}
        </Link>

        <div className="flex items-center gap-3">
          {/*
            Continue to preview — builds a draft with per-template slot
            overrides from the pasted content, then shows tall side-by-side
            snapshots of the content rendered in each selected template with a
            live full-size view of the active one. Needs a title + ≥1 real
            template selected.
          */}
          <div className="flex flex-col items-end">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue}
              title={
                canContinue
                  ? "Preview your content in each selected template"
                  : "Add a title and pick at least one template"
              }
              className="rounded-sm border border-[#2271b1] bg-white px-4 py-2 text-[13px] font-medium text-[#2271b1] hover:bg-[#f6fbfd] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBuilding ? "Building preview…" : "Continue to preview →"}
            </button>
            {buildError && (
              <span className="mt-0.5 max-w-[220px] text-right text-[11px] text-[#d63638]">
                {buildError}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate}
            className="rounded-sm bg-[#2271b1] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#135e96] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? "Creating…" : "Create draft & open editor"}
          </button>
        </div>
      </div>

      <p className="text-[12px] text-[#50575e]">
        Creating a draft saves the title, the pasted body and the first selected
        template, then opens the editor where you can refine content, SEO and
        publish settings.
      </p>

      {pasteOpen && (
        <PasteModal
          onClose={() => setPasteOpen(false)}
          onApprove={(file) => {
            uploadOne(file);
            setPasteOpen(false);
          }}
        />
      )}
    </div>
  );
}

// --- Preview step -----------------------------------------------------------
// Tall side-by-side snapshots of the pasted content rendered in each selected
// template (windowed to ~3), plus a live full-size view of the ACTIVE one.
// Hover arrows mid-left/right cycle the active template (wrap). "Use this
// template" binds it to the draft and opens the editor.
const PREVIEW_WINDOW = 3; // snapshots visible at once

function PreviewStep({
  postTypeSlug,
  draftId,
  templates,
  onBack,
}: {
  postTypeSlug: string;
  draftId: string;
  templates: WizardTemplate[];
  onBack: () => void;
}) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isBinding, startBind] = useTransition();

  const n = templates.length;
  const active = templates[Math.min(activeIndex, n - 1)];

  // Window the snapshot strip so the active card stays visible when there are
  // more than PREVIEW_WINDOW templates. Keeps one card before the active one
  // where possible.
  const maxStart = Math.max(0, n - PREVIEW_WINDOW);
  const windowStart = Math.min(Math.max(0, activeIndex - 1), maxStart);
  const visible = templates.slice(windowStart, windowStart + PREVIEW_WINDOW);

  function cycle(dir: -1 | 1) {
    setActiveIndex((i) => (i + dir + n) % n);
  }

  function handleUse() {
    startBind(async () => {
      await bindTemplate(draftId, active.id, postTypeSlug);
      router.push(`/admin/website/${postTypeSlug}/${draftId}`);
    });
  }

  const previewUrl = (id: string) =>
    `/preview/template/${id}?page=${encodeURIComponent(draftId)}`;

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-3">
      {/* Snapshot strip — click a card to make it active */}
      <div className="rounded-sm border border-[#c3c4c7] bg-white">
        <div className="flex items-center justify-between border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2">
          <span className="text-[13px] font-semibold text-[#1d2327]">
            Preview
            <span className="ml-2 text-[12px] font-normal text-[#50575e]">
              Your content rendered in each selected template. Pick the one you
              like.
            </span>
          </span>
          {n > PREVIEW_WINDOW && (
            <span className="text-[12px] text-[#50575e]">
              {activeIndex + 1} / {n}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 px-3 py-4">
          {n > PREVIEW_WINDOW && (
            <button
              type="button"
              onClick={() => cycle(-1)}
              aria-label="Previous template"
              className="shrink-0 rounded-full border border-[#c3c4c7] bg-white px-2 py-1 text-[15px] leading-none text-[#50575e] hover:bg-[#f0f0f1]"
            >
              ‹
            </button>
          )}
          <div className="flex flex-1 flex-wrap gap-4">
            {visible.map((t) => {
              const isActive = t.id === active.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setActiveIndex(templates.findIndex((x) => x.id === t.id))
                  }
                  style={{ width: CARD_W }}
                  className={`group relative flex flex-col overflow-hidden rounded-sm border bg-white text-left transition-shadow hover:shadow-sm ${
                    isActive
                      ? "border-[#2271b1] ring-2 ring-[#2271b1]"
                      : "border-[#dcdcde]"
                  }`}
                >
                  <div className="relative overflow-hidden border-b border-[#dcdcde] bg-white">
                    <TemplateMini
                      src={previewUrl(t.id)}
                      title={`${t.name} preview`}
                    />
                  </div>
                  <div className="px-2 py-1.5">
                    <span className="block truncate text-[13px] font-semibold text-[#1d2327]">
                      {t.name}
                    </span>
                    <span className="block truncate font-mono text-[12px] text-[#50575e]">
                      {t.slug}
                      {isActive ? " · active" : ""}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {n > PREVIEW_WINDOW && (
            <button
              type="button"
              onClick={() => cycle(1)}
              aria-label="Next template"
              className="shrink-0 rounded-full border border-[#c3c4c7] bg-white px-2 py-1 text-[15px] leading-none text-[#50575e] hover:bg-[#f0f0f1]"
            >
              ›
            </button>
          )}
        </div>
      </div>

      {/* Live full-size view of the ACTIVE template, with hover cycle arrows */}
      <div className="rounded-sm border border-[#c3c4c7] bg-white">
        <div className="flex items-center justify-between border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2">
          <span className="text-[13px] font-semibold text-[#1d2327]">
            {active.name}
            <span className="ml-2 font-mono text-[12px] font-normal text-[#50575e]">
              {active.slug}
            </span>
          </span>
          <a
            href={previewUrl(active.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-[#2271b1] hover:underline"
          >
            Open in new tab ↗
          </a>
        </div>
        <div className="group relative">
          <iframe
            key={active.id}
            src={previewUrl(active.id)}
            title={`${active.name} live preview`}
            className="block w-full"
            style={{ height: "820px", border: "0" }}
          />
          {n > 1 && (
            <>
              <button
                type="button"
                onClick={() => cycle(-1)}
                aria-label="Previous template"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-[#c3c4c7] bg-white/90 px-3 py-2 text-[18px] leading-none text-[#1d2327] opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => cycle(1)}
                aria-label="Next template"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-[#c3c4c7] bg-white/90 px-3 py-2 text-[18px] leading-none text-[#1d2327] opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100"
              >
                ›
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-[13px] text-[#2271b1] hover:underline"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleUse}
          disabled={isBinding}
          className="rounded-sm bg-[#2271b1] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#135e96] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBinding ? "Opening editor…" : "Use this template →"}
        </button>
      </div>
    </div>
  );
}

// --- Template snapshot card -------------------------------------------------
// A multi-select toggle. Clicking anywhere toggles selection; the snapshot
// iframe inside has pointer-events:none so clicks always hit the card.
function TemplateCard({
  selected,
  onToggle,
  name,
  sub,
  mono,
  children,
}: {
  selected: boolean;
  onToggle: () => void;
  name: string;
  sub: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      style={{ width: CARD_W }}
      className={`group relative flex flex-col overflow-hidden rounded-sm border bg-white text-left transition-shadow hover:shadow-sm ${
        selected
          ? "border-[#2271b1] ring-2 ring-[#2271b1]"
          : "border-[#dcdcde]"
      }`}
    >
      {/* Selected checkmark badge */}
      <span
        className={`absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border text-[12px] leading-none ${
          selected
            ? "border-[#2271b1] bg-[#2271b1] text-white"
            : "border-[#c3c4c7] bg-white/90 text-transparent"
        }`}
        aria-hidden
      >
        ✓
      </span>

      {/* Snapshot viewport — the child (TemplateMini or the None placeholder)
          sizes its own height so the card is a proportional page miniature. */}
      <div className="relative overflow-hidden border-b border-[#dcdcde] bg-white">
        {children}
      </div>

      <div className="px-2 py-1.5">
        <span className="block truncate text-[13px] font-semibold text-[#1d2327]">
          {name}
        </span>
        <span
          className={`block truncate text-[12px] text-[#50575e] ${
            mono ? "font-mono" : ""
          }`}
        >
          {sub}
        </span>
      </div>
    </button>
  );
}

// --- Paste-from-clipboard modal ---------------------------------------------
function PasteModal({
  onClose,
  onApprove,
}: {
  onClose: () => void;
  onApprove: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);

  // Focus the paste target on open so ⌘V/Ctrl V lands here.
  useEffect(() => {
    dropRef.current?.focus();
  }, []);

  // Auto-read the clipboard when the modal opens (it opened from a button
  // click — a user gesture — so the read is allowed), so the image appears
  // without the user pressing ⌘V. If the browser denies clipboard-read or
  // there's no image on the clipboard, we silently fall back to the manual
  // paste target below.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.clipboard?.read) return;
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const type = item.types.find((t) => t.startsWith("image/"));
          if (!type) continue;
          const blob = await item.getType(type);
          const ext = type.split("/")[1] || "png";
          const f = new File([blob], `pasted.${ext}`, { type });
          if (cancelled) return;
          setMessage(null);
          setFile(f);
          setPreviewUrl((old) => {
            if (old) URL.revokeObjectURL(old);
            return URL.createObjectURL(f);
          });
          return;
        }
      } catch {
        // Clipboard-read denied or unavailable — manual ⌘V paste still works.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Revoke the object URL when it changes / on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    let imgFile: File | null = null;
    if (items) {
      for (const it of Array.from(items)) {
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) {
            imgFile = f;
            break;
          }
        }
      }
    }
    if (!imgFile) {
      setMessage("That wasn't an image — copy an image and try again.");
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setMessage(null);
    setFile(imgFile);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(imgFile);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] rounded-sm border border-[#c3c4c7] bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2">
          <span className="text-[13px] font-semibold text-[#1d2327]">
            Paste from clipboard
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[16px] leading-none text-[#50575e] hover:text-[#1d2327]"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 px-3 py-3">
          <div
            ref={dropRef}
            tabIndex={0}
            onPaste={handlePaste}
            className="flex min-h-[200px] flex-col items-center justify-center rounded-sm border-2 border-dashed border-[#c3c4c7] bg-[#f6f7f7] p-3 text-center focus:border-[#2271b1] focus:outline-none"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Pasted preview"
                className="max-h-[300px] max-w-full rounded-sm object-contain"
              />
            ) : (
              <span className="text-[13px] text-[#50575e]">
                Paste your image here (⌘V / Ctrl V)
              </span>
            )}
          </div>

          {message && (
            <p className="text-[12px] text-[#d63638]">{message}</p>
          )}
          {file && (
            <p className="text-[12px] text-[#50575e]">
              Ready to add: {file.name || "pasted image"}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-[#c3c4c7] bg-white px-3 py-1.5 text-[13px] text-[#1d2327] hover:bg-[#f0f0f1]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!file}
            onClick={() => file && onApprove(file)}
            className="rounded-sm bg-[#2271b1] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#135e96] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Approve &amp; add
          </button>
        </div>
      </div>
    </div>
  );
}
