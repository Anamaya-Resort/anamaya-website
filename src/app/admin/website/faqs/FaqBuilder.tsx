"use client";

import { useMemo, useState, useTransition } from "react";
import type { FaqKnowledgeSettings } from "@/lib/website-builder/settings";
import {
  generateFaqSetAction,
  refineFaqsAction,
  saveFaqNotesAction,
  saveFaqSetAction,
  applyFaqSetToPageAction,
  type BuilderResult,
  type FaqSet,
} from "./builder-actions";

/**
 * FAQ builder. LEFT: the reference the AI should use (AnamayOS brand voice +
 * customer avatars, and your own notes), each with a checkbox. RIGHT: choose
 * the ARTICLE these FAQs are for, generate (from its content + the ticked
 * reference), edit, and apply the result straight to that article.
 */

export type AvatarOption = { id: string; name: string; description: string | null };
export type ArticleOption = {
  id: string;
  title: string;
  postType: string;
  urlPath: string | null;
};

type OutRow = {
  key: string;
  question: string;
  answer: string;
  is_featured: boolean;
};

let seq = 0;

const card = "rounded-sm border border-[#c3c4c7] bg-white";
const cardHead =
  "border-b border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px] font-semibold text-[#1d2327]";
const input =
  "w-full rounded-sm border border-[#8c8f94] bg-white px-2 py-1.5 text-[13px] focus:border-[#2271b1] focus:outline-none";
const btn =
  "rounded-sm bg-[#2271b1] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#135e96] disabled:opacity-50";
const btnGhost =
  "rounded-sm border border-[#2271b1] px-3 py-1.5 text-[13px] font-medium text-[#2271b1] hover:bg-[#f0f6fb] disabled:opacity-50";

export default function FaqBuilder({
  initialNotes,
  aoBrandName,
  avatars,
  articles,
  initialSets,
}: {
  initialNotes: FaqKnowledgeSettings;
  aoBrandName: string | null;
  avatars: AvatarOption[];
  articles: ArticleOption[];
  initialSets: FaqSet[];
}) {
  const [notes, setNotes] = useState<FaqKnowledgeSettings>(initialNotes);
  const [includeAoBrand, setIncludeAoBrand] = useState<boolean>(!!aoBrandName);
  // Avatars start UNCHECKED, since a good FAQ run usually leans on one or two.
  const [avatarSel, setAvatarSel] = useState<Set<string>>(() => new Set());
  const [manualSel, setManualSel] = useState({
    customer_avatars: !!initialNotes.customer_avatars,
    brand_vibe: !!initialNotes.brand_vibe,
    info: !!initialNotes.info,
    faq_content: !!initialNotes.faq_content,
  });
  // The single article these FAQs are for (content source + apply target).
  const [targetArticle, setTargetArticle] = useState<ArticleOption | null>(null);
  const [targetFilter, setTargetFilter] = useState("");
  const [prompt, setPrompt] = useState("");
  const [out, setOut] = useState<OutRow[]>([]);
  const [msg, setMsg] = useState<{
    kind: "error" | "ok" | "warn";
    text: string;
  } | null>(null);
  const [sets, setSets] = useState<FaqSet[]>(initialSets);
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);
  const [setName, setSetName] = useState("");
  const [pending, start] = useTransition();

  const outItems = () =>
    out.map((r) => ({
      question: r.question,
      answer: r.answer,
      is_featured: r.is_featured,
    }));

  const targetMatches = useMemo(() => {
    const q = targetFilter.trim().toLowerCase();
    if (!q) return [];
    return articles.filter((a) => a.title.toLowerCase().includes(q)).slice(0, 30);
  }, [targetFilter, articles]);

  function toggleAvatar(id: string) {
    setAvatarSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function apply(res: BuilderResult) {
    if (res.ok) {
      setOut(
        res.faqs.map((f) => ({
          key: `o${seq++}`,
          question: f.question,
          answer: f.answer,
          is_featured: f.is_featured,
        })),
      );
      setMsg({ kind: "ok", text: `Generated ${res.faqs.length} FAQs. Edit as needed.` });
    } else {
      setMsg({ kind: "error", text: res.error });
    }
  }

  function onGenerate() {
    start(async () => {
      const res = await generateFaqSetAction({
        prompt: prompt.trim() || undefined,
        includeAoBrand,
        avatarIds: [...avatarSel],
        manual: manualSel,
        manualNotes: notes,
        articleIds: targetArticle ? [targetArticle.id] : [],
      });
      apply(res);
    });
  }

  function onRefine() {
    if (!out.length) {
      setMsg({ kind: "error", text: "Generate a set first, then refine it." });
      return;
    }
    const instruction = prompt.trim();
    if (!instruction) {
      setMsg({
        kind: "error",
        text: "Type your change in the prompt box, e.g. “fix #5 and #7 to include our brand name”.",
      });
      return;
    }
    start(async () => {
      const res = await refineFaqsAction({ items: outItems(), instruction });
      if (!res.ok) {
        setMsg({ kind: "error", text: res.error });
        return;
      }
      setOut(
        res.faqs.map((f) => ({
          key: `o${seq++}`,
          question: f.question,
          answer: f.answer,
          is_featured: f.is_featured,
        })),
      );
      setMsg({ kind: "ok", text: `Refined (${res.faqs.length} FAQs).` });
    });
  }

  function onSaveNotes() {
    start(async () => {
      const res = await saveFaqNotesAction(notes);
      setMsg(
        res.ok
          ? { kind: "ok", text: "Notes saved." }
          : { kind: "error", text: res.error ?? "Save failed" },
      );
    });
  }

  function onSaveSet() {
    start(async () => {
      const res = await saveFaqSetAction({
        id: currentSetId ?? undefined,
        name: setName || targetArticle?.title || "",
        items: outItems(),
      });
      if (!res.ok) {
        setMsg({ kind: "error", text: res.error });
        return;
      }
      setCurrentSetId(res.set.id);
      setSets((s) => [res.set, ...s.filter((x) => x.id !== res.set.id)]);
      setMsg({ kind: "ok", text: `Saved as ${res.set.code}.` });
    });
  }

  function loadSet(set: FaqSet) {
    setOut(
      set.items.map((i) => ({
        key: `o${seq++}`,
        question: i.question,
        answer: i.answer,
        is_featured: i.is_featured,
      })),
    );
    setCurrentSetId(set.id);
    setSetName(set.name);
    setMsg({ kind: "ok", text: `Loaded ${set.code}. Edit, or apply it to the article.` });
  }

  function onApply() {
    const a = targetArticle;
    if (!a) {
      setMsg({ kind: "error", text: "Choose an article at the top first." });
      return;
    }
    if (!out.length) {
      setMsg({ kind: "error", text: "Nothing to apply. Generate or load a set first." });
      return;
    }
    if (
      !window.confirm(
        `Apply these ${out.length} FAQs to "${a.title}"? This replaces that page's current FAQs and publishes them.`,
      )
    )
      return;
    start(async () => {
      const res = await applyFaqSetToPageAction({
        pageId: a.id,
        items: outItems(),
        publicPath: a.urlPath ?? undefined,
      });
      if (!res.ok) {
        setMsg({ kind: "error", text: res.error ?? "Failed to apply" });
        return;
      }
      setMsg(
        res.warning
          ? { kind: "warn", text: `Applied to "${a.title}". ${res.warning}` }
          : { kind: "ok", text: `Applied to "${a.title}" and published.` },
      );
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* LEFT — reference the AI should use */}
      <div className="space-y-4">
        <div className={card}>
          <div className={cardHead}>From AnamayOS (live)</div>
          <div className="space-y-2 px-3 py-3 text-[13px]">
            {aoBrandName ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeAoBrand}
                  onChange={(e) => setIncludeAoBrand(e.target.checked)}
                  className="h-4 w-4"
                />
                Brand voice: <strong>{aoBrandName}</strong>
              </label>
            ) : (
              <p className="text-[12px] text-[#50575e]">No brand guide in AnamayOS.</p>
            )}
            {avatars.length > 0 && (
              <div>
                <p className="mb-1 mt-2 text-[12px] font-semibold uppercase tracking-wide text-[#50575e]">
                  Customer avatars{" "}
                  <span className="font-normal normal-case text-[#8a6d00]">
                    (pick one or two)
                  </span>
                </p>
                <div className="space-y-1">
                  {avatars.map((a) => (
                    <label key={a.id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={avatarSel.has(a.id)}
                        onChange={() => toggleAvatar(a.id)}
                        className="mt-0.5 h-4 w-4"
                      />
                      <span>
                        <strong>{a.name}</strong>
                        {a.description ? (
                          <span className="text-[#50575e]">: {a.description}</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={card}>
          <div className={cardHead}>Your notes</div>
          <div className="space-y-3 px-3 py-3">
            {(
              [
                ["info", "Info (facts, policies, logistics)"],
                ["brand_vibe", "Brand & vibe"],
                ["customer_avatars", "Customer avatar notes"],
                ["faq_content", "FAQ library"],
              ] as [keyof FaqKnowledgeSettings, string][]
            ).map(([field, label]) => (
              <div key={field}>
                <label className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-[#1d2327]">
                  <input
                    type="checkbox"
                    checked={manualSel[field]}
                    onChange={(e) =>
                      setManualSel((s) => ({ ...s, [field]: e.target.checked }))
                    }
                    className="h-4 w-4"
                  />
                  {label}
                </label>
                <textarea
                  value={notes[field] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNotes((n) => ({ ...n, [field]: val }));
                    if (val.trim() && !manualSel[field])
                      setManualSel((s) => ({ ...s, [field]: true }));
                  }}
                  rows={3}
                  className={input}
                />
              </div>
            ))}
            <button type="button" onClick={onSaveNotes} disabled={pending} className={btnGhost}>
              Save notes
            </button>
          </div>
        </div>

        <div className={card}>
          <div className={cardHead}>Saved sets ({sets.length})</div>
          <div className="px-3 py-3 text-[13px]">
            {sets.length === 0 ? (
              <p className="text-[12px] italic text-[#50575e]">
                None yet. Generate FAQs, then Save as set.
              </p>
            ) : (
              <ul className="space-y-1">
                {sets.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      <strong>{s.code}</strong>
                      {s.name ? `: ${s.name}` : ""}{" "}
                      <span className="text-[11px] text-[#50575e]">
                        ({s.items.length})
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => loadSet(s)}
                      className="shrink-0 text-[11px] font-semibold text-[#2271b1] hover:underline"
                    >
                      load
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT — choose the article, generate, edit, apply */}
      <div className="space-y-4">
        <div className={card}>
          <div className={cardHead}>1. Which article are these FAQs for?</div>
          <div className="space-y-2 px-3 py-3 text-[13px]">
            {targetArticle ? (
              <div className="flex items-center justify-between gap-2 rounded-sm bg-[#f6f7f7] px-2 py-1.5">
                <span className="min-w-0 truncate">
                  <strong>{targetArticle.title}</strong>{" "}
                  <span className="text-[11px] text-[#50575e]">
                    ({targetArticle.postType})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTargetArticle(null);
                    setTargetFilter("");
                  }}
                  className="shrink-0 text-[11px] font-semibold text-[#2271b1] hover:underline"
                >
                  change
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={targetFilter}
                  onChange={(e) => setTargetFilter(e.target.value)}
                  placeholder="Search a page or post by title…"
                  className={input}
                  autoComplete="off"
                />
                {targetMatches.length > 0 && (
                  <ul className="max-h-56 overflow-auto rounded-sm border border-[#dcdcde]">
                    {targetMatches.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetArticle(a);
                            setTargetFilter("");
                          }}
                          className="block w-full px-2 py-1 text-left hover:bg-[#f0f6fb]"
                        >
                          {a.title}{" "}
                          <span className="text-[11px] text-[#50575e]">({a.postType})</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[12px] italic text-[#50575e]">
                  The article&rsquo;s own content is used as the source, plus the
                  reference you tick on the left.
                </p>
              </>
            )}
          </div>
        </div>

        <div className={card}>
          <div className={cardHead}>2. Generate</div>
          <div className="space-y-3 px-3 py-3">
            <div>
              <label htmlFor="faq_prompt" className="mb-1 block text-[12px] font-semibold text-[#50575e]">
                Prompt / instructions
              </label>
              <textarea
                id="faq_prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                placeholder="New set: e.g. focus on travel & what's included. Refine: e.g. fix #5 and #7 to include our brand name."
                className={input}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onGenerate}
                disabled={pending || !targetArticle}
                className={btn}
              >
                {pending
                  ? "Working…"
                  : targetArticle
                    ? `Generate FAQs for this article`
                    : "Choose an article above first"}
              </button>
              {out.length > 0 && (
                <button
                  type="button"
                  onClick={onRefine}
                  disabled={pending}
                  className={btnGhost}
                >
                  Refine with this instruction
                </button>
              )}
            </div>
            {out.length > 0 && (
              <p className="text-[11px] italic text-[#50575e]">
                Generate makes a fresh set. Refine applies your instruction to the
                current list (by number), leaving the rest unchanged.
              </p>
            )}
            {msg && (
              <div
                className={
                  msg.kind === "error"
                    ? "rounded-sm border border-[#d63638] bg-[#fcf0f1] px-3 py-2 text-[13px] text-[#8a1f21]"
                    : msg.kind === "warn"
                      ? "rounded-sm border border-[#dba617] bg-[#fcf9e8] px-3 py-2 text-[13px] text-[#8a6d00]"
                      : "rounded-sm border border-[#68a67d] bg-[#f0faf3] px-3 py-2 text-[13px] text-[#1e7e34]"
                }
              >
                {msg.text}
              </div>
            )}
          </div>
        </div>

        <div className={card}>
          <div className={`${cardHead} flex items-center justify-between`}>
            <span>3. Review &amp; edit ({out.length})</span>
            <button
              type="button"
              onClick={() =>
                setOut((o) => [
                  ...o,
                  { key: `o${seq++}`, question: "", answer: "", is_featured: false },
                ])
              }
              className="text-[12px] font-semibold text-[#2271b1] hover:underline"
            >
              + Add
            </button>
          </div>
          <div className="space-y-3 px-3 py-3">
            {out.length === 0 && (
              <p className="text-[13px] italic text-[#50575e]">
                Nothing yet. Choose an article, tick reference on the left, and Generate.
              </p>
            )}
            {out.map((r, idx) => (
              <div key={r.key} className="rounded-sm border border-[#dcdcde] px-3 py-2">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-semibold text-[#50575e]">
                      #{idx + 1}
                    </span>
                    <label className="flex items-center gap-2 text-[12px] font-semibold text-[#1d2327]">
                      <input
                        type="checkbox"
                        checked={r.is_featured}
                        onChange={(e) =>
                          setOut((o) =>
                            o.map((x) =>
                              x.key === r.key
                                ? { ...x, is_featured: e.target.checked }
                                : x,
                            ),
                          )
                        }
                        className="h-4 w-4"
                      />
                      Featured
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOut((o) => o.filter((x) => x.key !== r.key))}
                    className="text-[11px] font-semibold text-[#b32d2e] hover:underline"
                  >
                    remove
                  </button>
                </div>
                <input
                  type="text"
                  value={r.question}
                  onChange={(e) =>
                    setOut((o) =>
                      o.map((x) =>
                        x.key === r.key ? { ...x, question: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="Question"
                  className={`${input} mb-2 font-medium`}
                />
                <textarea
                  value={r.answer}
                  onChange={(e) =>
                    setOut((o) =>
                      o.map((x) =>
                        x.key === r.key ? { ...x, answer: e.target.value } : x,
                      ),
                    )
                  }
                  rows={2}
                  placeholder="Answer"
                  className={input}
                />
              </div>
            ))}

            {out.length > 0 && (
              <div className="space-y-3 border-t border-[#dcdcde] pt-3">
                <button
                  type="button"
                  onClick={onApply}
                  disabled={pending || !targetArticle}
                  className={`${btn} w-full`}
                >
                  {targetArticle
                    ? `Apply to "${targetArticle.title}" (publishes its FAQs + schema)`
                    : "Choose an article above to apply"}
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    placeholder="Save as a reusable set (optional name)"
                    className={`${input} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={onSaveSet}
                    disabled={pending}
                    className={btnGhost}
                  >
                    {currentSetId ? "Update set" : "Save as set"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
