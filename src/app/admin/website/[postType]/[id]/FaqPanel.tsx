"use client";

import { useState, useTransition } from "react";
import type { PageFaq, PageFaqMeta } from "@/lib/website-builder/faqs";
import {
  generateFaqsAction,
  saveFaqsAction,
  setFaqApprovedAction,
  type FaqActionResult,
} from "./faq-actions";

/**
 * Per-article FAQ authoring panel (client). Drives the "For More Info" / FAQ
 * block's page-specific questions: AI draft, edit, mark Featured, and approve
 * for public display. Persists via the sibling faq-actions server actions.
 *
 * Lives OUTSIDE the main edit form (it manages its own saves), so its buttons
 * never submit that form.
 */

type Row = {
  key: string;
  id?: string;
  question: string;
  answer: string;
  is_featured: boolean;
  source: PageFaq["source"];
};

// Monotonic local key for rows the user adds (server rows key off their id).
let localKeySeq = 0;

function toRows(faqs: PageFaq[]): Row[] {
  return faqs.map((f) => ({
    key: f.id ?? `local-${localKeySeq++}`,
    id: f.id,
    question: f.question,
    answer: f.answer,
    is_featured: f.is_featured,
    source: f.source,
  }));
}

const btnPrimary =
  "rounded-sm bg-[#2271b1] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#135e96] disabled:opacity-50";
const btnSecondary =
  "rounded-sm border border-[#2271b1] px-3 py-1.5 text-[13px] font-medium text-[#2271b1] hover:bg-[#f0f6fb] disabled:opacity-50";
const inputCls =
  "w-full rounded-sm border border-[#8c8f94] bg-white px-2 py-1 text-[13px] focus:border-[#2271b1] focus:outline-none";

export default function FaqPanel({
  pageId,
  adminPath,
  publicPath,
  initialFaqs,
  initialMeta,
}: {
  pageId: string;
  adminPath: string;
  publicPath?: string;
  initialFaqs: PageFaq[];
  initialMeta: PageFaqMeta | null;
}) {
  const [rows, setRows] = useState<Row[]>(() => toRows(initialFaqs));
  const [meta, setMeta] = useState<PageFaqMeta | null>(initialMeta);
  const [prompt, setPrompt] = useState("");
  const [msg, setMsg] = useState<{ kind: "error" | "ok"; text: string } | null>(
    null,
  );
  const [pending, start] = useTransition();

  const paths = { adminPath, publicPath };
  const hasContent = rows.some((r) => r.question.trim() || r.answer.trim());
  const featuredCount = rows.filter((r) => r.is_featured).length;
  const approved = !!meta?.approved;

  function apply(res: FaqActionResult, okText?: string) {
    if (res.ok) {
      setRows(toRows(res.faqs));
      setMeta(res.meta);
      setMsg(okText ? { kind: "ok", text: okText } : null);
    } else {
      setMsg({ kind: "error", text: res.error });
    }
  }

  function payload() {
    return rows.map((r) => ({
      question: r.question,
      answer: r.answer,
      is_featured: r.is_featured,
      source: r.source,
    }));
  }

  function onGenerate() {
    if (
      hasContent &&
      !window.confirm(
        "Replace the current FAQs with a fresh AI draft? Any manual edits to these questions will be lost.",
      )
    )
      return;
    start(async () => {
      const res = await generateFaqsAction({
        pageId,
        extraPrompt: prompt.trim() || undefined,
        ...paths,
      });
      apply(res, res.ok ? "Draft generated. Review, edit, then Publish." : undefined);
    });
  }

  function onSave() {
    start(async () => {
      apply(await saveFaqsAction({ pageId, faqs: payload(), ...paths }), "Saved.");
    });
  }

  function onTogglePublish() {
    if (approved) {
      start(async () => {
        apply(
          await setFaqApprovedAction({ pageId, approved: false, ...paths }),
          "Unpublished — no longer shown on the page.",
        );
      });
      return;
    }
    // Publishing: save the current edits first so what goes live matches the
    // editor exactly, then approve.
    start(async () => {
      const saved = await saveFaqsAction({ pageId, faqs: payload(), ...paths });
      if (!saved.ok) return apply(saved);
      apply(
        await setFaqApprovedAction({ pageId, approved: true, ...paths }),
        "Published — now shown on this page.",
      );
    });
  }

  function editRow(key: string, patch: Partial<Row>, isTextEdit: boolean) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        // Editing the text of an AI-drafted row marks it as human-edited.
        if (isTextEdit && r.source === "ai") next.source = "edited";
        return next;
      }),
    );
  }

  function addRow() {
    setRows((rs) => [
      ...rs,
      {
        key: `local-${localKeySeq++}`,
        question: "",
        answer: "",
        is_featured: false,
        source: "manual",
      },
    ]);
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  return (
    <div className="mt-4 rounded-sm border border-[#c3c4c7] bg-white">
      <div className="flex items-center justify-between border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2">
        <span className="text-[13px] font-semibold text-[#1d2327]">
          FAQs — &ldquo;For More Info&rdquo; block
        </span>
        <span
          className={
            approved
              ? "rounded-full bg-[#e6f4ea] px-2 py-0.5 text-[11px] font-semibold text-[#1e7e34]"
              : "rounded-full bg-[#fbf0dc] px-2 py-0.5 text-[11px] font-semibold text-[#8a6d00]"
          }
        >
          {approved ? "Published — shown on this page" : "Draft — not shown publicly"}
        </span>
      </div>

      <div className="space-y-4 px-3 py-3">
        <p className="text-[12px] leading-relaxed text-[#50575e]">
          These questions appear wherever a For More Info / FAQ block sits on
          this page&rsquo;s template. The AI drafts them from this page&rsquo;s
          own content; you review and edit, mark the best few as{" "}
          <strong>Featured</strong> (always open), and the rest tuck into a
          collapsible panel. Nothing shows to the public until you{" "}
          <strong>Publish</strong>.
        </p>

        {msg && (
          <div
            className={
              msg.kind === "error"
                ? "rounded-sm border border-[#d63638] bg-[#fcf0f1] px-3 py-2 text-[13px] text-[#8a1f21]"
                : "rounded-sm border border-[#68a67d] bg-[#f0faf3] px-3 py-2 text-[13px] text-[#1e7e34]"
            }
          >
            {msg.text}
          </div>
        )}

        {/* AI generation */}
        <div className="rounded-sm border border-[#dcdcde] bg-[#f6f7f7] px-3 py-3">
          <label
            htmlFor="faq_prompt"
            className="mb-1 block text-[12px] font-semibold text-[#50575e]"
          >
            Optional guidance for the AI
          </label>
          <input
            id="faq_prompt"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. focus on travel logistics and what's included"
            className={inputCls}
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onGenerate}
              disabled={pending}
              className={btnPrimary}
            >
              {pending
                ? "Working…"
                : hasContent
                  ? "Regenerate with AI"
                  : "Generate with AI"}
            </button>
            <span className="text-[12px] text-[#50575e]">
              Drafts from this page&rsquo;s content. Replaces the list below.
            </span>
          </div>
        </div>

        {/* Editable list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-[#50575e]">
              {rows.length} question{rows.length === 1 ? "" : "s"} ·{" "}
              {featuredCount} featured
            </span>
            <button type="button" onClick={addRow} className={btnSecondary}>
              + Add question
            </button>
          </div>

          {rows.length === 0 && (
            <p className="rounded-sm border border-dashed border-[#c3c4c7] px-3 py-6 text-center text-[13px] italic text-[#50575e]">
              No FAQs yet. Generate a draft with the AI, or add one manually.
            </p>
          )}

          {rows.map((r) => (
            <div
              key={r.key}
              className="rounded-sm border border-[#dcdcde] bg-white px-3 py-3"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-[12px] font-semibold text-[#1d2327]">
                  <input
                    type="checkbox"
                    checked={r.is_featured}
                    onChange={(e) =>
                      editRow(r.key, { is_featured: e.target.checked }, false)
                    }
                    className="h-4 w-4"
                  />
                  Featured (always open)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wide text-[#a7aaad]">
                    {r.source}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(r.key)}
                    className="rounded-sm border border-[#d63638] px-2 py-0.5 text-[11px] font-semibold text-[#d63638] hover:bg-[#fcf0f1]"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={r.question}
                onChange={(e) =>
                  editRow(r.key, { question: e.target.value }, true)
                }
                placeholder="Question a real guest would ask"
                className={`${inputCls} mb-2 font-medium`}
              />
              <textarea
                value={r.answer}
                onChange={(e) => editRow(r.key, { answer: e.target.value }, true)}
                placeholder="Short, warm, accurate answer (1–3 sentences)"
                rows={2}
                className={`${inputCls} resize-y`}
              />
            </div>
          ))}
        </div>

        {/* Save + publish */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#dcdcde] pt-3">
          <div className="text-[12px] text-[#50575e]">
            {meta?.generated_at && (
              <>Last updated: {new Date(meta.generated_at).toLocaleString()}</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={pending}
              className={btnSecondary}
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={onTogglePublish}
              disabled={pending || (!approved && !hasContent)}
              className={btnPrimary}
            >
              {approved ? "Unpublish" : "Save & Publish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
