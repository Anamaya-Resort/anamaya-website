import "server-only";
import type { EffectiveIdentity } from "./organization";

/**
 * Shared prompt-assembly helpers for the AI tools. All tools (rewrite,
 * headlines, ask, future visitor agent) compose system + user messages
 * from the same building blocks: an identity preamble describing the
 * tenant, a key/value page-context block, and the selection itself.
 *
 * Keeping this in one place ensures every tool stays tenant-agnostic
 * and consistent in tone — change the brand voice once, every tool
 * picks it up.
 */

export type IdentitySummary = Pick<
  EffectiveIdentity,
  "name" | "tagline" | "industry" | "primary_offering"
> & {
  property: { name: string } | null;
};

/**
 * One-line "you are an X for {brand} · tagline · industry · ..." preamble.
 * Used as the lead of every system prompt so the model picks up the
 * brand voice before being told what task to perform.
 */
export function buildIdentityPreamble(
  role: string,
  identity: IdentitySummary | null,
): string {
  if (!identity) return `You are ${role}.`;
  const bits = [
    `brand: ${identity.name}`,
    identity.tagline ? `tagline: ${identity.tagline}` : null,
    identity.industry ? `industry: ${identity.industry}` : null,
    identity.primary_offering ? `offering: ${identity.primary_offering}` : null,
    identity.property ? `property scope: ${identity.property.name}` : null,
  ].filter(Boolean);
  return `You are ${role} for ${identity.name}. ${bits.join(" · ")}`;
}

/**
 * Render arbitrary page context (postType, postId, title, urlPath, …) as
 * a "- key: value" block for the user message. Skips empty values so
 * the prompt doesn't get padded with nulls.
 */
export function formatKv(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("\n");
}

export type ContextBlocks = {
  /** Page-level context dictionary (post id, title, etc.). May be null. */
  pageContext?: Record<string, unknown> | null;
  /** The user's current selection. May be empty (e.g. write mode). */
  selection?: string;
  /** Label for the selection block. e.g. "Passage to rewrite", "Selected text (use as context)". */
  selectionLabel?: string;
  /** The user's free-text instruction. May be empty. */
  instruction?: string;
  /** Label for the instruction block. e.g. "Instruction", "Style guidance". */
  instructionLabel?: string;
  /** Optional trailing line, e.g. "Return 10 alternatives." */
  trailer?: string;
};

/**
 * Assemble the user-message body from the standard blocks. Each block is
 * skipped when empty so the prompt stays tight.
 */
export function assembleUserMessage(blocks: ContextBlocks): string {
  const parts: string[] = [];

  if (blocks.pageContext && Object.keys(blocks.pageContext).length > 0) {
    parts.push(`Page context:\n${formatKv(blocks.pageContext)}`);
  }
  if (blocks.selection && blocks.selection.trim().length > 0) {
    const label = blocks.selectionLabel ?? "Selection";
    parts.push(`${label}:\n"""\n${blocks.selection}\n"""`);
  }
  if (blocks.instruction && blocks.instruction.trim().length > 0) {
    const label = blocks.instructionLabel ?? "Instruction";
    parts.push(`${label}:\n${blocks.instruction}`);
  }
  if (blocks.trailer && blocks.trailer.trim().length > 0) {
    parts.push(blocks.trailer);
  }
  return parts.join("\n\n");
}
