"use client";

import { useRef, useState } from "react";
import { captureAndUploadBlockSnapshot } from "@/components/admin/blocks/snapshot";

/**
 * Batch snapshot backfill. For each block that has no preview, renders it in
 * isolation via /block-preview/{slug} inside a hidden same-origin iframe, waits
 * for it to settle, and captures + uploads it with the SAME helper the editor
 * uses on save (which already knows how to reach into an iframe's document).
 *
 * Runs entirely client-side and sequentially, so nothing overwhelms the server
 * and each capture gets a clean, fully-rendered frame.
 */

type B = { id: string; slug: string; name: string };
type Result = { name: string; ok: boolean; reason?: string };

// How long to let a block settle after the iframe's load event, so images,
// fonts, and async/server-only blocks (faq, featured_*, calendars) finish.
const SETTLE_MS = 2000;
const HARD_TIMEOUT_MS = 12000;

export default function SnapshotBackfill({ blocks }: { blocks: B[] }) {
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(-1);
  const [results, setResults] = useState<Result[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function loadPreview(slug: string): Promise<void> {
    return new Promise((resolve) => {
      const iframe = iframeRef.current;
      if (!iframe) return resolve();
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      iframe.onload = () => setTimeout(finish, SETTLE_MS);
      // Cache-bust so re-runs don't serve a stale frame.
      iframe.src = `/block-preview/${slug}?t=${Date.now()}`;
      setTimeout(finish, HARD_TIMEOUT_MS);
    });
  }

  async function run() {
    setRunning(true);
    setResults([]);
    for (let k = 0; k < blocks.length; k++) {
      setCurrent(k);
      const b = blocks[k];
      let res: { ok: boolean; reason?: string };
      try {
        await loadPreview(b.slug);
        res = await captureAndUploadBlockSnapshot(b.id, wrapRef.current as HTMLElement);
      } catch (e) {
        res = { ok: false, reason: e instanceof Error ? e.message : String(e) };
      }
      setResults((r) => [...r, { name: b.name, ok: res.ok, reason: res.reason }]);
    }
    setCurrent(-1);
    setRunning(false);
  }

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={running || blocks.length === 0}
        className="rounded-md bg-[#2271b1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#135e96] disabled:opacity-50"
      >
        {running
          ? `Working ${current + 1} / ${blocks.length}…`
          : blocks.length === 0
            ? "Nothing missing"
            : `Generate ${blocks.length} missing previews`}
      </button>

      {(results.length > 0 || running) && (
        <p className="mt-3 text-sm text-anamaya-charcoal/70">
          Done {results.length} / {blocks.length} · {okCount} ok · {failCount}{" "}
          failed
          {!running && results.length > 0 && (
            <>
              . Go back to{" "}
              <a href="/admin/blocks" className="text-[#2271b1] hover:underline">
                Blocks
              </a>{" "}
              to see them.
            </>
          )}
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-3 max-h-80 overflow-auto rounded-md border border-zinc-200 text-[13px]">
          {results.map((r, i) => (
            <li
              key={i}
              className="flex items-center gap-2 border-b border-zinc-100 px-3 py-1.5 last:border-b-0"
            >
              <span className={r.ok ? "text-green-600" : "text-red-600"}>
                {r.ok ? "✓" : "✕"}
              </span>
              <span className="truncate text-anamaya-charcoal">{r.name}</span>
              {!r.ok && r.reason && (
                <span className="truncate text-[11px] text-red-500">
                  {r.reason}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Hidden capture stage. The wrapper holds the iframe; the capture helper
          finds the iframe inside it and snapshots its document. */}
      <div
        ref={wrapRef}
        aria-hidden
        style={{
          position: "fixed",
          left: -100000,
          top: 0,
          width: 1200,
          pointerEvents: "none",
        }}
      >
        <iframe
          ref={iframeRef}
          title="snapshot capture stage"
          style={{ width: 1200, height: 900, border: 0 }}
        />
      </div>
    </div>
  );
}
