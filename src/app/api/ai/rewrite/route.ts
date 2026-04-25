import { NextResponse } from "next/server";
import { getSessionUser, isAdminUser } from "@/lib/session";
import { runChat, type ChatMessage } from "@/lib/ai/client";
import { getOrganizationContext } from "@/lib/ai/organization";

type Mode = "rewrite" | "write" | "ask";

type Body = {
  modelRef: string;
  mode: Mode;
  instruction: string;
  selection: string;
  propertyId?: string | null;
  pageContext?: Record<string, unknown> | null;
};

const VALID_MODES: Mode[] = ["rewrite", "write", "ask"];

function bad(reason: string, status = 400) {
  return NextResponse.json({ ok: false, reason }, { status });
}

/**
 * Single endpoint backing the Rewrite / Write / Ask tabs of the AI panel.
 * Mode determines the system prompt; identity (org + property) comes
 * from AnamayOS so prompts are tenant-agnostic.
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
  if (!VALID_MODES.includes(body.mode)) return bad("Invalid mode");
  const instruction = (body.instruction ?? "").trim();
  const selection = body.selection ?? "";
  if (body.mode === "rewrite" && !selection.trim()) {
    return bad("Rewrite mode requires a selection");
  }
  if ((body.mode === "write" || body.mode === "ask") && !instruction) {
    return bad("Instruction is required");
  }

  const ctx = await getOrganizationContext();
  const identity = ctx?.resolve(body.propertyId ?? null) ?? null;

  const messages = buildMessages({
    mode: body.mode,
    instruction,
    selection,
    identity,
    pageContext: body.pageContext ?? null,
  });

  const result = await runChat({
    modelRef: body.modelRef,
    messages,
    maxTokens: body.mode === "ask" ? 800 : 1500,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }
  return NextResponse.json({
    ok: true,
    text: result.text,
    usage: result.usage,
  });
}

function buildMessages({
  mode,
  instruction,
  selection,
  identity,
  pageContext,
}: {
  mode: Mode;
  instruction: string;
  selection: string;
  identity: ReturnType<NonNullable<Awaited<ReturnType<typeof getOrganizationContext>>>["resolve"]> | null;
  pageContext: Record<string, unknown> | null;
}): ChatMessage[] {
  const system = systemPromptFor(mode, identity);
  const userParts: string[] = [];

  if (pageContext && Object.keys(pageContext).length > 0) {
    userParts.push(
      `Page context:\n${formatKv(pageContext)}`,
    );
  }
  if (selection) {
    userParts.push(
      mode === "rewrite"
        ? `Passage to rewrite:\n"""\n${selection}\n"""`
        : `Selected text (use as context):\n"""\n${selection}\n"""`,
    );
  }
  if (instruction) {
    userParts.push(`Instruction:\n${instruction}`);
  } else if (mode === "rewrite") {
    userParts.push("Instruction:\nImprove clarity and flow without changing meaning.");
  }

  return [
    { role: "system", content: system },
    { role: "user", content: userParts.join("\n\n") },
  ];
}

function systemPromptFor(
  mode: Mode,
  identity: { name: string; tagline: string | null; industry: string | null; primary_offering: string | null; property: { name: string } | null } | null,
): string {
  const lines: string[] = [];
  if (identity) {
    const bits = [
      `brand: ${identity.name}`,
      identity.tagline ? `tagline: ${identity.tagline}` : null,
      identity.industry ? `industry: ${identity.industry}` : null,
      identity.primary_offering ? `offering: ${identity.primary_offering}` : null,
      identity.property ? `property scope: ${identity.property.name}` : null,
    ].filter(Boolean);
    lines.push(`You are an editorial assistant for ${identity.name}. ${bits.join(" · ")}`);
  } else {
    lines.push("You are an editorial assistant.");
  }
  lines.push("Match the brand's voice. Be concrete; avoid generic marketing fluff.");

  if (mode === "rewrite") {
    lines.push(
      "Rewrite the passage according to the instruction.",
      "Preserve any HTML structure, links, and formatting verbatim — only change visible prose.",
      "Return ONLY the rewritten passage. No preamble, no explanation, no quotes around the output.",
    );
  } else if (mode === "write") {
    lines.push(
      "Write a new passage following the instruction.",
      "If a selection is shown, treat it as context, not as text to be reproduced.",
      "Return ONLY the new passage. No preamble, no explanation.",
    );
  } else {
    lines.push(
      "Answer the user's question. The selection is supporting context.",
      "Be concise and practical. No marketing tone — just the answer.",
    );
  }
  return lines.join(" ");
}

function formatKv(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("\n");
}
