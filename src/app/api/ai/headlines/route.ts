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
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Some models wrap JSON in prose. Pluck the first {...} block.
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return [];
    try {
      parsed = JSON.parse(m[0]);
    } catch {
      return [];
    }
  }
  if (!parsed || typeof parsed !== "object") return [];
  const obj = parsed as Record<string, unknown>;
  const arr = obj.headlines ?? obj.alternatives ?? obj.options ?? obj.titles;
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((v): v is string => typeof v === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, TARGET_COUNT);
}
