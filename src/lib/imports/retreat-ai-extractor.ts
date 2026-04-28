import "server-only";

/**
 * AI-based extraction for retreat leaders. The regex extractor handles the
 * single-leader case via the page-title hint, but Anamaya retreats often
 * feature multiple teachers (co-leaders, special guests, assistants) whose
 * names only appear inline — sometimes only as headshot captions or as the
 * opening line of a bio. The shapes vary too much for regex.
 *
 * A small, cheap model (gpt-4o-mini, JSON mode) sees the cleaned page once
 * and returns a structured leader array. `actions.ts` calls this first and
 * falls back to `extractRetreatLeadersRegex` only if the AI call fails.
 */

import { runChat, type ChatMessage } from "@/lib/ai/client";
import type { ExtractedLeader, LeaderRole } from "./retreat-extractor";

const MODEL_REF = "openai:gpt-4o-mini";
const VALID_ROLES: ReadonlySet<LeaderRole> = new Set(["primary", "co", "guest", "assistant"]);

/** Max chars of HTML to send to the model — keeps cost predictable. */
const MAX_HTML_CHARS = 28_000;

export type AIExtractResult =
  | { ok: true; leaders: ExtractedLeader[]; description_html?: string }
  | { ok: false; reason: string };

/**
 * Strip class/style/data-* attrs and Elementor wrapper noise so the model
 * sees content, not template scaffolding. Keeps `src`/`alt` on imgs and
 * heading/paragraph/strong structure intact.
 */
function compactForAI(html: string): string {
  let out = html;
  // Drop scripts/styles/svgs/templates entirely.
  out = out.replace(/<(script|style|svg|template|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  // Drop opening tags' class/style/data-*/id/role/aria-* attrs (and their Elementor cousins).
  out = out.replace(/<([a-z0-9]+)\b([^>]*)>/gi, (_, tag: string, attrs: string) => {
    if (tag === "img") {
      const src = attrs.match(/\bsrc\s*=\s*"([^"]*)"/i)?.[1];
      const alt = attrs.match(/\balt\s*=\s*"([^"]*)"/i)?.[1];
      const dsrc = attrs.match(/\bdata-src\s*=\s*"([^"]*)"/i)?.[1];
      const finalSrc = src || dsrc;
      if (!finalSrc) return "";
      return `<img src="${finalSrc}"${alt ? ` alt="${alt}"` : ""}>`;
    }
    return `<${tag}>`;
  });
  // Collapse whitespace.
  out = out.replace(/\s+/g, " ").trim();
  // Drop empty/wrapper tags that add nothing for the model.
  for (let i = 0; i < 5; i++) {
    const before = out;
    out = out.replace(/<(div|span|section|article|header|footer|main|aside|figure|figcaption)>\s*<\/\1>/gi, "");
    out = out.replace(/<(div|span|section|article|header|footer|main|aside)>([\s\S]*?)<\/\1>/gi, "$2");
    if (out === before) break;
  }
  if (out.length > MAX_HTML_CHARS) out = out.slice(0, MAX_HTML_CHARS);
  return out;
}

export async function extractRetreatBodyAI(input: {
  title: string;
  bodyHtml: string;
}): Promise<AIExtractResult> {
  const compact = compactForAI(input.bodyHtml);
  if (compact.length < 200) {
    return { ok: false, reason: "compacted body too short for AI extraction" };
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You extract structured information from an Anamaya retreat web page. " +
        "Return ONLY JSON in the form {\"leaders\": [...], \"description_html\": \"...\"}. No commentary. " +
        "" +
        "leaders: an array of teacher objects. Each has: " +
        "name (string, required), " +
        "role (one of \"primary\", \"co\", \"guest\", \"assistant\"), " +
        "credentials (string, optional — e.g. \"E-RYT 500\", \"PhD\"), " +
        "bio_html (string, optional — short HTML <p>…</p> bio), " +
        "photo_url (string, optional — exact src of their headshot <img>). " +
        "Role guidance: " +
        "- primary: the lead teacher whose name dominates the page title; if only one teacher, they are primary. " +
        "- co: equal-billing partner — both/all names listed in the title joined by '&' or 'and' or ','. " +
        "- guest: labeled 'Special Guest', 'Guest Teacher', 'Featured Guest', or appears as a separate visiting teacher. " +
        "- assistant: labeled 'Assistant', 'Co-host', or clearly subordinate billing. " +
        "Pull photo_url from the exact src= of an <img> visually associated with the teacher (their headshot). " +
        "If you cannot confidently identify any teacher, return leaders: []. " +
        "" +
        "description_html: the main descriptive prose that explains what the retreat is about — the 'About this retreat' / overview / introduction paragraphs. " +
        "Wrap each paragraph in <p>…</p>. Preserve <strong>, <em>, <ul>/<li> if present, but strip everything else (no divs, classes, styles, or section wrappers). " +
        "EXCLUDE: teacher bios (those go in leaders[].bio_html), pricing tables, dates/booking widgets, gallery captions, navigation, footer, repeated CTAs ('Book Now', 'Reserve Your Spot'). " +
        "Aim for 2–8 paragraphs of meaningful body copy. If the page has no descriptive prose, return description_html: \"\".",
    },
    {
      role: "user",
      content:
        `Page title: ${input.title}\n\nPage HTML (cleaned):\n${compact}`,
    },
  ];

  const res = await runChat({
    modelRef: MODEL_REF,
    messages,
    maxTokens: 4000,
    responseFormat: "json",
  });
  if (!res.ok) return { ok: false, reason: res.reason };

  let parsed: unknown;
  try {
    parsed = JSON.parse(res.text);
  } catch {
    return { ok: false, reason: "AI response was not valid JSON" };
  }

  const leadersRaw =
    parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).leaders)
      ? ((parsed as Record<string, unknown>).leaders as unknown[])
      : null;
  if (!leadersRaw) return { ok: false, reason: "AI response missing leaders array" };

  const leaders: ExtractedLeader[] = [];
  for (const raw of leadersRaw) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name) continue;
    const roleStr = typeof r.role === "string" ? r.role.toLowerCase().trim() : "primary";
    const role: LeaderRole = VALID_ROLES.has(roleStr as LeaderRole)
      ? (roleStr as LeaderRole)
      : "primary";
    leaders.push({
      role,
      name,
      credentials: typeof r.credentials === "string" && r.credentials.trim() ? r.credentials.trim() : undefined,
      bio_html: typeof r.bio_html === "string" && r.bio_html.trim() ? r.bio_html.trim() : undefined,
      photo_url: typeof r.photo_url === "string" && /^https?:\/\//i.test(r.photo_url) ? r.photo_url : undefined,
    });
  }

  // If multiple leaders but none flagged primary, promote the first to primary
  // so downstream "set is_primary" logic in push.ts has someone to mark.
  if (leaders.length > 1 && !leaders.some((l) => l.role === "primary")) {
    leaders[0] = { ...leaders[0], role: "primary" };
  }

  const parsedObj = parsed as Record<string, unknown>;
  const descRaw = typeof parsedObj.description_html === "string" ? parsedObj.description_html.trim() : "";
  const description_html = descRaw.length > 0 ? descRaw : undefined;

  return { ok: true, leaders, description_html };
}
