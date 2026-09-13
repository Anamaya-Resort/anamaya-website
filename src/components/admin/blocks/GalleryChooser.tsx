"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Loader2, Check, Images, Globe, Lock, X, TriangleAlert } from "lucide-react";

type Gallery = {
  code: string;
  name: string;
  description: string | null;
  is_published: boolean;
  item_count: number;
  previews: string[];
};

/**
 * Pick an AnamayaOS gallery for a block.
 *
 * The same shape as the picker in AnamayaOS — searchable rows, each
 * one showing what is actually in the gallery — minus everything that
 * creates or changes. Galleries are curated in AnamayaOS; this side
 * only points at one. So there is no New Gallery button here, and
 * nothing in this modal writes.
 *
 * Drafts are listed and labelled rather than hidden. A draft renders
 * as nothing on the live site, and an editor needs to be able to see
 * that this is why, instead of picking a code and getting an empty
 * block with no explanation.
 */
export default function GalleryChooser({
  open,
  currentCode,
  onClose,
  onPick,
}: {
  open: boolean;
  currentCode?: string;
  onClose: () => void;
  onPick: (code: string) => void;
}) {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  // Starts true and is reset on close: the first state change has to
  // happen after the fetch, never synchronously inside the effect.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // Fetched inside a callback rather than straight from the effect
  // body, so no state is set during the render pass that opened it.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/galleries");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `Failed (${res.status})`);
        if (cancelled) return;
        setGalleries(json.galleries ?? []);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Closing clears the search, so the modal opens on the full list
  // next time rather than on the last thing somebody typed.
  const close = useCallback(() => {
    setQ("");
    setLoading(true);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return galleries;
    return galleries.filter(
      (g) =>
        g.name.toLowerCase().includes(needle) ||
        g.code.toLowerCase().includes(needle) ||
        (g.description ?? "").toLowerCase().includes(needle),
    );
  }, [galleries, q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onClick={close}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-3">
          <Images className="h-5 w-5 text-anamaya-green" />
          <div className="flex-1">
            <h2 className="font-heading text-lg text-anamaya-charcoal">
              Choose a gallery
            </h2>
            <p className="text-xs text-anamaya-charcoal/60">
              Curated in AnamayaOS. This block follows whatever the gallery holds.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded p-1 text-anamaya-charcoal/50 hover:bg-zinc-100 hover:text-anamaya-charcoal"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-zinc-200 px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-anamaya-charcoal/40" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search galleries by name or code"
              className="w-full rounded-md border border-zinc-300 py-2 pl-9 pr-3 text-sm focus:border-anamaya-green focus:outline-none focus:ring-1 focus:ring-anamaya-green"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-5 py-2 text-sm text-red-700">
            <TriangleAlert className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-anamaya-charcoal/50">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-anamaya-charcoal/60">
              <Images className="h-6 w-6" />
              {galleries.length === 0
                ? "No galleries yet — build one in AnamayaOS under Images."
                : "No gallery matches that."}
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((g) => {
                const isCurrent = currentCode === g.code;
                return (
                  <li key={g.code}>
                    <button
                      type="button"
                      onClick={() => onPick(g.code)}
                      className={`flex w-full items-center gap-4 rounded-lg border p-3 text-left transition-colors ${
                        isCurrent
                          ? "border-anamaya-green bg-anamaya-green/10 ring-2 ring-anamaya-green/30"
                          : "border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex shrink-0 gap-1">
                        {g.previews.length > 0 ? (
                          g.previews.map((url) => (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              key={url}
                              src={url}
                              alt=""
                              className="h-14 w-14 rounded object-cover"
                              loading="lazy"
                            />
                          ))
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded bg-zinc-100 text-anamaya-charcoal/40">
                            <Images className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium text-anamaya-charcoal">
                            {g.name}
                          </span>
                          <code className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-anamaya-charcoal/60">
                            {g.code}
                          </code>
                          <span
                            className={`flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
                              g.is_published
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {g.is_published ? (
                              <Globe className="h-2.5 w-2.5" />
                            ) : (
                              <Lock className="h-2.5 w-2.5" />
                            )}
                            {g.is_published ? "Published" : "Draft — hidden on the site"}
                          </span>
                        </div>
                        <div className="text-xs text-anamaya-charcoal/60">
                          {g.item_count} {g.item_count === 1 ? "image" : "images"}
                          {g.description ? ` · ${g.description}` : ""}
                        </div>
                      </div>
                      {isCurrent && (
                        <Check className="h-5 w-5 shrink-0 text-anamaya-green" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-zinc-200 px-5 py-2 text-[11px] text-anamaya-charcoal/60">
          To add, remove or reorder images, edit the gallery in AnamayaOS — every
          block using its code follows.
        </div>
      </div>
    </div>
  );
}
