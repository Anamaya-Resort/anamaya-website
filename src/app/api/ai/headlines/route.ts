import { NextResponse } from "next/server";
import { getSessionUser, isAdminUser } from "@/lib/session";
import { runChat, type ChatMessage } from "@/lib/ai/client";
import { getOrganizationContext } from "@/lib/ai/organization";
import {
  assembleUserMessage,
  buildIdentityPreamble,
  type IdentitySummary,
} from "@/lib/ai/prompt";

const TARGET_COUNT = 10;

type Body = {
  modelRef: string;
  selection: string;
  instruction?: string;
  propertyId?: string | null;
  pageContext?: Record<string, unknown> | null;
};

function bad(reason: string, status = 400) {
  return NextResponse.json({ ok: false, reason }, { status });
}

/**
 * Generates 10 headline alternatives for the selected passage.
 * Identity-aware — same getOrganizationContext() resolve flow as the
 * rewrite endpoint — so prompts stay tenant-agnostic.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!isAdminUser(user)) return bad("Unauthorized", 401);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("Invalid JSON");
  }

  if (!body.modelRef) return bad("Missing modelRef");
  const selection = (body.selection ?? "").trim();
  if (!selection) return bad("Selection is required");

  const ctx = await getOrganizationContext();
  const identity = ctx?.resolve(body.propertyId ?? null) ?? null;

  const messages = buildMessages({
    selection,
    instruction: (body.instruction ?? "").trim(),
    identity,
    pageContext: body.pageContext ?? null,
  });

  const result = await runChat({
    modelRef: body.modelRef,
    messages,
    maxTokens: 800,
    responseFormat: "json",
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }

  const headlines = parseHeadlines(result.text);
  if (headlines.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        reason: "Model didn't return any headlines. Try a different model or a more specific instruction.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, headlines, usage: result.usage });
}

function buildMessages({
  selection,
  instruction,
  identity,
  pageContext,
}: {
  selection: string;
  instruction: string;
  identity: IdentitySummary | null;
  pageContext: Record<string, unknown> | null;
}): ChatMessage[] {
  const system = [
    buildIdentityPreamble("a headline writer", identity),
    "Match the brand's voice. Vary structure across the set: questions, declaratives, lists, hooks.",
    `Return EXACTLY ${TARGET_COUNT} headlines as JSON in the form {"headlines":["...","..."]}. No commentary.`,
  ].join(" ");

  const user = assembleUserMessage({
    pageContext,
    selection,
    selectionLabel: "Current headline / passage",
    instruction,
    instructionLabel: "Style guidance",
    trailer: `Return ${TARGET_COUNT} alternatives.`,
  });

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function parseHeadlines(text: string): string[] {
  // Try in order: full JSON parse, first {...} block, first [...] block,
  // numbered/bulleted prose list. JSON-mode usually delivers the first;
  // the others are defenses for models that ignore the format hint.
  const fromJson = tryJsonParse(text);
  const candidate =
    fromJson ??
    tryJsonParse(matchFirst(text, /\{[\s\S]*\}/)) ??
    tryJsonParse(matchFirst(text, /\[[\s\S]*\]/));

  let arr: unknown[] | null = null;
  if (Array.isArray(candidate)) {
    arr = candidate;
  } else if (candidate && typeof candidate === "object") {
    const obj = candidate as Record<string, unknown>;
    const v =
      obj.headlines ?? obj.alternatives ?? obj.options ?? obj.titles ?? obj.items;
    if (Array.isArray(v)) arr = v;
  }

  if (!arr) {
    // Last resort: parse a numbered or bulleted prose list.
    arr = parseProseList(text);
  }

  return (arr ?? [])
    .filter((v): v is string => typeof v === "string")
    .map((s) => s.replace(/^["'\s]+|["'\s]+$/g, "").trim())
    .filter((s) => s.length > 0)
    .slice(0, TARGET_COUNT);
}

function tryJsonParse(text: string | null): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function matchFirst(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? m[0] : null;
}

function parseProseList(text: string): string[] {
  return text
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*(?:\d+[\.)]|[-*•])\s+/, "").trim())
    .filter((line) => line.length > 0 && line.length < 400);
}
