import { NextResponse } from "next/server";
import { getSessionUser, isAdminUser } from "@/lib/session";
import { runChat, type ChatMessage } from "@/lib/ai/client";
import { getOrganizationContext } from "@/lib/ai/organization";
import {
  assembleUserMessage,
  buildIdentityPreamble,
  type IdentitySummary,
} from "@/lib/ai/prompt";

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
 * from AnamayOS so prompts stay tenant-agnostic.
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
  identity: IdentitySummary | null;
  pageContext: Record<string, unknown> | null;
}): ChatMessage[] {
  const system = systemPromptFor(mode, identity);

  // Rewrite mode supplies a default instruction when the user leaves it
  // blank; the other modes already validated instruction is present.
  const finalInstruction =
    mode === "rewrite" && !instruction
      ? "Improve clarity and flow without changing meaning."
      : instruction;

  const user = assembleUserMessage({
    pageContext,
    selection,
    selectionLabel:
      mode === "rewrite"
        ? "Passage to rewrite"
        : "Selected text (use as context)",
    instruction: finalInstruction,
    instructionLabel: "Instruction",
  });

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function systemPromptFor(mode: Mode, identity: IdentitySummary | null): string {
  const role = "an editorial assistant";
  const lines: string[] = [buildIdentityPreamble(role, identity)];
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
