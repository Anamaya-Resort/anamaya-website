"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
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

  // Paste anywhere in the wizard: if the clipboard carries image/video files,
  // upload them. Text/HTML pastes into the body textarea fall through
  // untouched (we only act when there are real files on the clipboard).
  function handlePaste(e: React.ClipboardEvent) {
    const files = e.clipboardData?.files;
    if (!files || files.length === 0) return;
    const mediaFiles = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
    );
    if (mediaFiles.length === 0) return;
    e.preventDefault();
    for (const f of mediaFiles) uploadOne(f);
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
  const cardBase =
    "flex cursor-pointer items-start gap-2 rounded-sm border bg-white px-3 py-2 text-[13px] hover:border-[#2271b1] has-[:checked]:border-[#2271b1] has-[:checked]:bg-[#f0f6fc]";

  return (
    <div className="mx-auto max-w-[820px] space-y-4" onPaste={handlePaste}>
      {/* STEP 1 — Choose templates + content */}

      {/* Choose templates (multi-select) */}
      <div className="rounded-sm border border-[#c3c4c7] bg-white">
        <div className="border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]">
          Choose templates
          <span className="ml-2 text-[12px] font-normal text-[#50575e]">
            Pick one or more layouts to preview this{" "}
            {postTypeLabel.toLowerCase()} in. You can change it later.
          </span>
        </div>
        <div className="grid gap-2 px-3 py-3 sm:grid-cols-2">
          {/* None — rich-text fallback */}
          <label
            className={`${cardBase} ${
              selectedTemplateIds.includes(NONE_ID)
                ? "border-[#2271b1]"
                : "border-[#dcdcde]"
            }`}
          >
            <input
              type="checkbox"
              checked={selectedTemplateIds.includes(NONE_ID)}
              onChange={() => toggleTemplate(NONE_ID)}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block font-semibold text-[#1d2327]">
                None (rich-text fallback)
              </span>
              <span className="block text-[12px] text-[#50575e]">
                Renders from the body HTML instead of CMS blocks.
              </span>
            </span>
          </label>

          {templates.map((t) => (
            <label
              key={t.id}
              className={`${cardBase} ${
                selectedTemplateIds.includes(t.id)
                  ? "border-[#2271b1]"
                  : "border-[#dcdcde]"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedTemplateIds.includes(t.id)}
                onChange={() => toggleTemplate(t.id)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="block font-semibold text-[#1d2327]">
                  {t.name}
                </span>
                <span className="block font-mono text-[12px] text-[#50575e]">
                  {t.slug}
                  {t.isDefault ? " · default" : ""}
                </span>
              </span>
            </label>
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
                Paste plain text or HTML / blocks. Pasted images and videos are
                uploaded automatically.
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-sm border border-[#2271b1] bg-white px-3 py-1.5 text-[13px] text-[#2271b1] hover:bg-[#f6fbfd]"
            >
              Add images / videos
            </button>

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
    </div>
  );
}
