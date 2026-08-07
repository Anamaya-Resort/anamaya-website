"use client";

import { useMemo, useState, useTransition } from "react";
import type { FaqKnowledgeSettings } from "@/lib/website-builder/settings";
import {
  generateFaqSetAction,
  saveFaqNotesAction,
  saveFaqSetAction,
  applyFaqSetToPageAction,
  type BuilderResult,
  type FaqSet,
} from "./builder-actions";

/**
 * Two-panel FAQ builder. LEFT: pick the information to feed the AI (AnamayOS
 * brand voice + avatars, your own notes, and specific website articles), each
 * with a checkbox. RIGHT: a prompt, Generate, and the editable output.
 */

export type AvatarOption = { id: string; name: string; description: string | null };
export type ArticleOption = { id: string; title: string; postType: string };

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
  const [avatarSel, setAvatarSel] = useState<Set<string>>(
    () => new Set(avatars.map((a) => a.id)),
  );
  const [manualSel, setManualSel] = useState({
    customer_avatars: !!initialNotes.customer_avatars,
    brand_vibe: !!initialNotes.brand_vibe,
    info: !!initialNotes.info,
    faq_content: !!initialNotes.faq_content,
  });
  const [picked, setPicked] = useState<ArticleOption[]>([]);
  const [filter, setFilter] = useState("");
  const [prompt, setPrompt] = useState("");
  const [out, setOut] = useState<OutRow[]>([]);
  const [msg, setMsg] = useState<{ kind: "error" | "ok"; text: string } | null>(
    null,
  );
  const [sets, setSets] = useState<FaqSet[]>(initialSets);
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);
  const [setName, setSetName] = useState("");
  const [applyFilter, setApplyFilter] = useState("");
  const [pending, start] = useTransition();

  const outItems = () =>
    out.map((r) => ({
      question: r.question,
      answer: r.answer,
      is_featured: r.is_featured,
    }));

  const applyMatches = useMemo(() => {
    const q = applyFilter.trim().toLowerCase();
    if (!q) return [];
    return articles.filter((a) => a.title.toLowerCase().includes(q)).slice(0, 20);
  }, [applyFilter, articles]);

  function onSaveSet() {
    start(async () => {
      const res = await saveFaqSetAction({
        id: currentSetId ?? undefined,
        name: setName,
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
    setMsg({
      kind: "ok",
      text: `Loaded ${set.code}. Edit and re-save, or apply it to a page.`,
    });
  }

  function applyToPage(a: ArticleOption) {
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
      const res = await applyFaqSetToPageAction({ pageId: a.id, items: outItems() });
      setMsg(
        res.ok
          ? { kind: "ok", text: `Applied to "${a.title}" and published.` }
          : { kind: "error", text: res.error ?? "Failed to apply" },
      );
      if (res.ok) setApplyFilter("");
    });
  }

  const pickedIds = useMemo(() => new Set(picked.map((p) => p.id)), [picked]);
  const matches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return [];
    return articles
      .filter((a) => !pickedIds.has(a.id) && a.title.toLowerCase().includes(q))
      .slice(0, 30);
  }, [filter, articles, pickedIds]);

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
        articleIds: picked.map((p) => p.id),
      });
      apply(res);
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

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* LEFT — information sources */}
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
                Brand voice — <strong>{aoBrandName}</strong>
              </label>
            ) : (
              <p className="text-[12px] text-[#50575e]">No brand guide in AnamayOS.</p>
            )}
            {avatars.length > 0 && (
              <div>
                <p className="mb-1 mt-2 text-[12px] font-semibold uppercase tracking-wide text-[#50575e]">
                  Customer avatars
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
                          <span className="text-[#50575e]"> — {a.description}</span>
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
                  onChange={(e) =>
                    setNotes((n) => ({ ...n, [field]: e.target.value }))
                  }
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
          <div className={cardHead}>Website articles</div>
          <div className="space-y-2 px-3 py-3 text-[13px]">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search pages & posts to add…"
              className={input}
            />
            {matches.length > 0 && (
              <ul className="max-h-48 overflow-auto rounded-sm border border-[#dcdcde]">
                {matches.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked((p) => [...p, a]);
                        setFilter("");
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
            {picked.length > 0 ? (
              <ul className="space-y-1">
                {picked.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-sm bg-[#f6f7f7] px-2 py-1"
                  >
                    <span className="truncate">{a.title}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPicked((p) => p.filter((x) => x.id !== a.id))
                      }
                      className="text-[11px] font-semibold text-[#b32d2e] hover:underline"
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] italic text-[#50575e]">
                No articles added. Their content will be used as source material.
              </p>
            )}
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
                      {s.name ? ` — ${s.name}` : ""}{" "}
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

      {/* RIGHT — prompt + generator + output */}
      <div className="space-y-4">
        <div className={card}>
          <div className={cardHead}>Generate</div>
          <div className="space-y-3 px-3 py-3">
            <div>
              <label htmlFor="faq_prompt" className="mb-1 block text-[12px] font-semibold text-[#50575e]">
                Prompt / instructions
              </label>
              <textarea
                id="faq_prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. Write general FAQs about booking, travel, and what's included. Keep answers under 2 sentences."
                className={input}
              />
            </div>
            <button type="button" onClick={onGenerate} disabled={pending} className={btn}>
              {pending ? "Working…" : "Generate FAQs"}
            </button>
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
          </div>
        </div>

        <div className={card}>
          <div className={`${cardHead} flex items-center justify-between`}>
            <span>Output ({out.length})</span>
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
                Nothing yet. Pick sources on the left, add a prompt, and Generate.
              </p>
            )}
            {out.map((r) => (
              <div key={r.key} className="rounded-sm border border-[#dcdcde] px-3 py-2">
                <div className="mb-2 flex items-center justify-between">
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
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    placeholder="Set name (optional)"
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
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-[#50575e]">
                    Apply to a page — publishes its FAQs (and schema)
                  </label>
                  <input
                    type="text"
                    value={applyFilter}
                    onChange={(e) => setApplyFilter(e.target.value)}
                    placeholder="Search a page or post to apply to…"
                    className={input}
                  />
                  {applyMatches.length > 0 && (
                    <ul className="mt-1 max-h-40 overflow-auto rounded-sm border border-[#dcdcde]">
                      {applyMatches.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => applyToPage(a)}
                            className="block w-full px-2 py-1 text-left hover:bg-[#f0f6fb]"
                          >
                            {a.title}{" "}
                            <span className="text-[11px] text-[#50575e]">
                              ({a.postType})
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
