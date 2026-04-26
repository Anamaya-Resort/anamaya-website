import { NextResponse } from "next/server";
import { runChat, type ChatMessage } from "@/lib/ai/client";
import { getOrganizationContext } from "@/lib/ai/organization";
import { searchChunks, type RetrievedChunk } from "@/lib/ai/retrieval";
import { getAvailableModels } from "@/lib/ai/providers";
import {
  assembleUserMessage,
  buildIdentityPreamble,
  type IdentitySummary,
} from "@/lib/ai/prompt";

/**
 * Public visitor agent. UNAUTHENTICATED on purpose — this is the chat
 * bubble on the marketing site. Gated by:
 *   1. organizations.visitor_agent_enabled (per-tenant kill switch).
 *   2. A naive 30-question rolling cap per IP per hour.
 *   3. The model picker — only the org's default text model is used;
 *      visitors don't choose.
 *
 * Grounded in content_chunks via cosine similarity. Out-of-scope or
 * uncertain questions are answered with a "I'm not sure — here's how to
 * reach the team" fallback rather than confident hallucination.
 */

type AskBody = {
  question: string;
  /** Optional history for follow-ups. Last N turns are included verbatim. */
  history?: { role: "user" | "assistant"; content: string }[];
  /** Optional property scope so per-property pages get scoped retrieval. */
  propertyId?: string | null;
};

const MAX_HISTORY_TURNS = 6;
const MAX_HISTORY_CHAR_BUDGET = 16_000;
const MAX_TURN_CHARS = 4_000;
const MAX_QUESTION_CHARS = 1000;
const RETRIEVAL_COUNT = 6;
// Same threshold as match_content_chunks default — keep the two in sync
// so the visitor agent and any future tool see consistent recall.
const RETRIEVAL_THRESHOLD = 0.65;

// Module-level rate-limit state. Survives within a single serverless
// instance — good enough for a soft cap; replace with Upstash/Redis
// when traffic warrants it.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 30;
// Cap the bucket map so a flood of unique IPs can't grow it without bound.
// LRU-style eviction: oldest entry is dropped when the cap is reached.
const RATE_LIMIT_MAX_BUCKETS = 10_000;
const ipBuckets = new Map<string, number[]>();

function bad(reason: string, status = 400) {
  return NextResponse.json({ ok: false, reason }, { status });
}

export async function POST(req: Request) {
  let body: AskBody;
  try {
    body = (await req.json()) as AskBody;
  } catch {
    return bad("Invalid JSON");
  }

  const question = (body.question ?? "").trim();
  if (!question) return bad("Empty question");
  if (question.length > MAX_QUESTION_CHARS) {
    return bad(`Question exceeds ${MAX_QUESTION_CHARS} characters`);
  }

  const ip = clientIp(req);
  if (!withinRateLimit(ip)) {
    return NextResponse.json(
      {
        ok: false,
        reason: "Too many questions — please come back in an hour.",
      },
      { status: 429 },
    );
  }

  const ctx = await getOrganizationContext();
  if (!ctx) {
    return bad("Visitor agent isn't configured.", 503);
  }
  if (!ctx.org.visitor_agent_enabled) {
    return bad("Visitor agent is disabled for this site.", 503);
  }

  const identity = ctx.resolve(body.propertyId ?? null);

  // Pick the org's default text model (whatever AnamayOS marked as
  // role_best_text). Visitors don't see a picker.
  const models = await getAvailableModels("text");
  const modelRef = models.defaultRef;
  if (!modelRef) {
    return bad("No active text model is configured for this site.", 503);
  }

  let chunks: RetrievedChunk[] = [];
  try {
    chunks = await searchChunks(question, {
      matchCount: RETRIEVAL_COUNT,
      matchThreshold: RETRIEVAL_THRESHOLD,
      propertyId: body.propertyId ?? null,
    });
  } catch (err) {
    console.warn(
      "[ai/ask] retrieval failed:",
      err instanceof Error ? err.message : err,
    );
  }

  const history = sanitizeHistory(body.history ?? []);

  const messages = buildMessages({
    question,
    history,
    chunks,
    identity,
  });

  const result = await runChat({
    modelRef,
    messages,
    maxTokens: 600,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    text: result.text,
    citations: chunks.slice(0, 4).map((c) => ({
      title: c.title,
      url: c.urlPath,
    })),
  });
}

function buildMessages({
  question,
  history,
  chunks,
  identity,
}: {
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
  chunks: RetrievedChunk[];
  identity: IdentitySummary | null;
}): ChatMessage[] {
  const system = [
    buildIdentityPreamble("a visitor agent", identity),
    "Answer questions strictly from the SOURCES section below. Match the brand's voice but be plain and helpful, not salesy.",
    "If the sources don't contain the answer, say so honestly and point the visitor to the contact / booking link if it's relevant. Don't invent details.",
    "Keep answers concise — 2 to 5 short sentences unless the visitor explicitly asks for detail. Use plain text, no markdown headings.",
  ].join(" ");

  const sources = chunks.length > 0 ? formatSources(chunks) : "(no relevant sources found)";
  const user = assembleUserMessage({
    selection: sources,
    selectionLabel: "SOURCES",
    instruction: question,
    instructionLabel: "Question",
  });

  const out: ChatMessage[] = [{ role: "system", content: system }];
  for (const m of history) {
    out.push({ role: m.role, content: m.content });
  }
  out.push({ role: "user", content: user });
  return out;
}

function formatSources(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => {
      const head = c.title
        ? `[${i + 1}] ${c.title}${c.urlPath ? ` (${c.urlPath})` : ""}`
        : `[${i + 1}]${c.urlPath ? ` ${c.urlPath}` : ""}`;
      return `${head}\n${c.content}`;
    })
    .join("\n\n---\n\n");
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

function withinRateLimit(ip: string): boolean {
  if (ip === "unknown") return true; // don't punish missing headers
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const bucket = (ipBuckets.get(ip) ?? []).filter((t) => t > cutoff);
  if (bucket.length >= RATE_LIMIT_MAX) {
    // Refresh recency so the limited IP doesn't get evicted while it's
    // still being throttled. delete + set re-orders the Map's iteration.
    ipBuckets.delete(ip);
    ipBuckets.set(ip, bucket);
    return false;
  }
  bucket.push(now);
  ipBuckets.delete(ip);
  ipBuckets.set(ip, bucket);
  evictOldBuckets();
  return true;
}

function evictOldBuckets() {
  if (ipBuckets.size <= RATE_LIMIT_MAX_BUCKETS) return;
  // Map iteration is insertion order; oldest entry is the first key.
  const toDrop = ipBuckets.size - RATE_LIMIT_MAX_BUCKETS;
  let i = 0;
  for (const key of ipBuckets.keys()) {
    if (i >= toDrop) break;
    ipBuckets.delete(key);
    i += 1;
  }
}

function sanitizeHistory(
  raw: unknown[],
): { role: "user" | "assistant"; content: string }[] {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  let charBudget = MAX_HISTORY_CHAR_BUDGET;
  // Walk newest-first so the most recent context survives when truncated.
  for (let i = raw.length - 1; i >= 0; i -= 1) {
    const m = raw[i] as { role?: unknown; content?: unknown } | null;
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    const content = typeof m.content === "string" ? m.content : "";
    if (!content) continue;
    const trimmed = content.length > MAX_TURN_CHARS
      ? content.slice(0, MAX_TURN_CHARS)
      : content;
    if (trimmed.length > charBudget) break;
    charBudget -= trimmed.length;
    out.unshift({ role: m.role, content: trimmed });
    if (out.length >= MAX_HISTORY_TURNS * 2) break;
  }
  return out;
}
