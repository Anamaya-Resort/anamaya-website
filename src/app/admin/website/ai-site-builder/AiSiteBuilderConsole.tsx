"use client";

import { useEffect, useRef, useState } from "react";
import { MODES, DEFAULT_MODE, type BuilderMode } from "@/lib/ai-site-builder/presets";

type RunResult = { text: string; prUrl: string | null; branch: string };
type UserMsg = { role: "user"; content: string; images: string[] };
type RunMsg = {
  role: "run";
  steps: string[];
  logs: string[];
  result?: RunResult;
  error?: string;
  done: boolean;
};
type Msg = UserMsg | RunMsg;

type Img = { id: string; name: string; dataUrl: string };

const SUGGESTIONS = [
  "Build a new “meet the teacher” block with a photo, name, and bio.",
  "Add an option to the testimonials block to show 2 or 3 columns.",
  "Fix the spacing on the gallery block on mobile.",
];

const MAX_IMAGES = 4;
const MAX_BYTES = 3.5 * 1024 * 1024; // keeps the request under the platform limit

function splitDataUrl(dataUrl: string): { mediaType: string; base64: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  return m ? { mediaType: m[1], base64: m[2] } : null;
}

export default function AiSiteBuilderConsole({ configured }: { configured: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<Img[]>([]);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<BuilderMode>(DEFAULT_MODE);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const modeBlurb = MODES.find((m) => m.id === mode)?.blurb ?? "";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    for (const f of list) {
      if (f.size > MAX_BYTES) {
        alert(`"${f.name || "image"}" is too large (max 3.5 MB). Try a smaller screenshot.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () =>
        setImages((prev) =>
          prev.length >= MAX_IMAGES
            ? prev
            : [...prev, { id: `${Date.now()}-${f.name}-${prev.length}`, name: f.name || "pasted image", dataUrl: String(reader.result) }],
        );
      reader.readAsDataURL(f);
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const imgs = Array.from(e.clipboardData.items)
      .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
      .map((it) => it.getAsFile())
      .filter((f): f is File => !!f);
    if (imgs.length) addFiles(imgs);
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((im) => im.id !== id));
  }

  function updateRun(fn: (r: RunMsg) => RunMsg) {
    setMessages((m) => {
      const i = m.map((x) => x.role).lastIndexOf("run");
      if (i < 0) return m;
      const copy = m.slice();
      copy[i] = fn(copy[i] as RunMsg);
      return copy;
    });
  }

  async function send(text: string) {
    const content = text.trim();
    if ((!content && images.length === 0) || busy) return;
    const sentImages = images;
    setMessages((m) => [
      ...m,
      { role: "user", content, images: sentImages.map((im) => im.dataUrl) },
      { role: "run", steps: [], logs: [], done: false },
    ]);
    setInput("");
    setImages([]);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ai-site-builder/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content }],
          mode,
          images: sentImages.map((im) => splitDataUrl(im.dataUrl)).filter(Boolean),
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        updateRun((r) => ({ ...r, error: data?.error ?? "The builder couldn't start.", done: true }));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let ev: { type: string; text?: string; prUrl?: string | null; branch?: string };
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === "step") updateRun((r) => ({ ...r, steps: [...r.steps, ev.text ?? ""] }));
          else if (ev.type === "log")
            updateRun((r) => ({ ...r, logs: [...r.logs, ev.text ?? ""].slice(-200) }));
          else if (ev.type === "result")
            updateRun((r) => ({
              ...r,
              done: true,
              result: { text: ev.text ?? "Done.", prUrl: ev.prUrl ?? null, branch: ev.branch ?? "" },
            }));
          else if (ev.type === "error") updateRun((r) => ({ ...r, error: ev.text ?? "Something failed.", done: true }));
        }
      }
      updateRun((r) => (r.done ? r : { ...r, done: true }));
    } catch {
      updateRun((r) => ({ ...r, error: "Lost the connection to the builder.", done: true }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full overflow-hidden rounded-sm border border-[#c3c4c7] bg-white text-[15px]">
      <div className="flex items-center justify-between border-b border-[#c3c4c7] bg-[#f6f7f7] px-4 py-2.5">
        <h2 className="text-[16px] font-semibold text-[#1d2327]">Chat with the builder</h2>
        <span
          className={`rounded-full px-2 py-[1px] text-[13px] font-medium ${
            configured ? "bg-[#edf7ed] text-[#1e7e34]" : "bg-[#fcf3e6] text-[#8a6d3b]"
          }`}
        >
          {configured ? "Connected" : "Setup pending"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[#c3c4c7] bg-white px-4 py-2 text-[15px]">
        <label htmlFor="builder-mode" className="font-medium text-[#1d2327]">
          Mode
        </label>
        <select
          id="builder-mode"
          value={mode}
          disabled={busy}
          onChange={(e) => setMode(e.target.value as BuilderMode)}
          className="h-8 rounded-sm border border-[#8c8f94] bg-white px-2 text-[15px] text-[#1d2327] disabled:opacity-50"
        >
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <span className="text-[14px] text-[#50575e]">{modeBlurb}</span>
      </div>

      {!configured && (
        <div className="border-b border-[#f0c36d] bg-[#fcf8e3] px-4 py-2.5 text-[14px] text-[#8a6d3b]">
          Not fully connected yet — the owner needs to finish a one-time setup. You can
          try it below, but it won&apos;t make real changes until then.
        </div>
      )}

      <div ref={scrollRef} className="max-h-[55vh] min-h-[16rem] overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-[15px] text-[#50575e]">Try one of these to get started:</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-sm border border-[#c3c4c7] bg-[#f6f7f7] px-3.5 py-2.5 text-left text-[15px] text-[#1d2327] transition-colors hover:border-[#2271b1] hover:bg-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <li key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-md bg-[#2271b1] px-3 py-2 text-[15px] leading-relaxed text-white">
                    {m.content && <div className="whitespace-pre-wrap">{m.content}</div>}
                    {m.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.images.map((src, k) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={k} src={src} alt="" className="max-h-32 rounded border border-white/40" />
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ) : (
                <li key={i} className="flex justify-start">
                  <div className="w-full rounded-md bg-[#f0f0f1] px-3 py-2.5 text-[15px] text-[#1d2327]">
                    <ol className="space-y-1">
                      {m.steps.map((s, j) => {
                        const isLast = j === m.steps.length - 1;
                        const pending = isLast && !m.done && !m.error;
                        return (
                          <li key={j} className="flex items-start gap-2">
                            <span className={pending ? "text-[#2271b1]" : "text-[#1e7e34]"}>
                              {pending ? "▸" : "✓"}
                            </span>
                            <span className={pending ? "text-[#1d2327]" : "text-[#50575e]"}>{s}</span>
                          </li>
                        );
                      })}
                    </ol>

                    {m.logs.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[14px] text-[#2271b1]">
                          {m.done ? "View log" : "Live log"}
                        </summary>
                        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-sm bg-[#1d2327] px-2 py-1.5 text-[13px] leading-snug text-zinc-200">
                          {m.logs.slice(-80).join("\n")}
                        </pre>
                      </details>
                    )}

                    {m.result && (
                      <div className="mt-2 border-t border-[#dcdcde] pt-2">
                        <div className="font-medium text-[#1e7e34]">{m.result.text}</div>
                        {m.result.prUrl && (
                          <a
                            href={m.result.prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block rounded-sm bg-[#2271b1] px-3 py-1 text-[14px] font-medium text-white hover:bg-[#135e96]"
                          >
                            Review changes →
                          </a>
                        )}
                      </div>
                    )}

                    {m.error && (
                      <div className="mt-2 border-t border-[#f0c0c0] pt-2 text-[#b32d2e]">{m.error}</div>
                    )}
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-[#c3c4c7] bg-[#f6f7f7] p-3"
      >
        {images.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {images.map((im) => (
              <div key={im.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.dataUrl} alt={im.name} className="h-16 w-16 rounded border border-[#c3c4c7] object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(im.id)}
                  aria-label="Remove image"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#1d2327] text-[12px] text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy || images.length >= MAX_IMAGES}
            title="Add an image"
            className="h-10 shrink-0 rounded-sm border border-[#8c8f94] bg-white px-3 text-[15px] text-[#1d2327] hover:bg-[#f6f7f7] disabled:opacity-40"
          >
            + Image
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={onPaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={6}
            placeholder="Describe a change… You can paste a screenshot here too. (⌘/Ctrl+Enter to send)"
            className="max-h-72 min-h-[8rem] flex-1 resize-y rounded-sm border border-[#8c8f94] bg-white px-3 py-2 text-[15px] leading-relaxed text-[#1d2327] outline-none placeholder:text-[#646970] focus:border-[#2271b1] focus:shadow-[0_0_0_1px_#2271b1]"
          />
          <button
            type="submit"
            disabled={busy || (!input.trim() && images.length === 0)}
            className="h-10 shrink-0 rounded-sm bg-[#2271b1] px-5 text-[15px] font-medium text-white transition-colors hover:bg-[#135e96] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Working…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
