"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { createItem } from "./actions";
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
// Each template card shows a scaled-down LIVE preview. We render the preview
// at a full desktop viewport width inside the iframe, then CSS-scale the whole
// iframe down so it reads as a tall thumbnail. The visible frame clips it via
// overflow:hidden.
const SNAP_W = 240; // visible card/snapshot width in px
const SNAP_H = 340; // visible snapshot height in px (tall crop)
const IFRAME_W = 1200; // logical viewport the preview renders at
const SNAP_SCALE = SNAP_W / IFRAME_W; // 0.2
const IFRAME_H = Math.round(SNAP_H / SNAP_SCALE); // logical iframe height

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
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#f6f7f7] px-3 text-center">
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
              <div
                style={{
                  width: IFRAME_W,
                  height: IFRAME_H,
                  transform: `scale(${SNAP_SCALE})`,
                  transformOrigin: "top left",
                }}
              >
                <iframe
                  src={`/preview/template/${t.id}`}
                  title={`${t.name} preview`}
                  loading="lazy"
                  tabIndex={-1}
                  style={{
                    width: IFRAME_W,
                    height: IFRAME_H,
                    border: "0",
                    pointerEvents: "none",
                  }}
                />
              </div>
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
            PHASE 2 SEAM — "Continue to preview".
            The next phase mounts a 3-up snapshot preview here (tall
            side-by-side snapshots of `body` rendered in each of
            `selectedTemplateIds`, click-to-expand to live HTML, hover
            arrows mid-left/mid-right to cycle). It will receive
            selectedTemplateIds, title, body and media as props. Until then
            the button is disabled so nothing half-built ships.
          */}
          <div className="flex flex-col items-end">
            <button
              type="button"
              disabled
              title="Preview is coming in the next phase"
              className="cursor-not-allowed rounded-sm bg-[#dcdcde] px-4 py-2 text-[13px] font-medium text-[#8c8f94]"
            >
              Continue to preview →
            </button>
            <span className="mt-0.5 text-[11px] text-[#50575e]">
              (preview coming next)
            </span>
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
      style={{ width: SNAP_W }}
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

      {/* Tall snapshot viewport — clips the scaled iframe */}
      <div
        style={{ width: SNAP_W, height: SNAP_H }}
        className="relative overflow-hidden border-b border-[#dcdcde] bg-white"
      >
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
