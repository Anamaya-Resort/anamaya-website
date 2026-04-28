import "server-only";

/**
 * AI-based extraction for retreat content. Two parallel calls:
 *   - extractRetreatBodyAI       → leaders + description
 *   - extractRetreatWorkshopsAI  → optional workshops with pricing schema
 *
 * Originally these were a single combined call, but gpt-4o-mini reliably
 * skipped the workshops field when also asked to produce full leader bios
 * + description (the long earlier output saturated its attention). Two
 * dedicated, focused calls cost ~2× a single call but are reliable.
 */

import { runChat, type ChatMessage } from "@/lib/ai/client";
import type { ExtractedLeader, ExtractedWorkshop, LeaderRole } from "./retreat-extractor";

const MODEL_REF = "openai:gpt-4o-mini";
const VALID_ROLES: ReadonlySet<LeaderRole> = new Set(["primary", "co", "guest", "assistant"]);

/** Max chars of HTML to send to the model — keeps cost predictable. */
const MAX_HTML_CHARS = 60_000;

export type AIExtractResult =
  | {
      ok: true;
      leaders: ExtractedLeader[];
      description_html?: string;
    }
  | { ok: false; reason: string };

export type AIWorkshopsResult =
  | { ok: true; workshops: ExtractedWorkshop[] }
  | { ok: false; reason: string };

/**
 * Strip class/style/data-* attrs so the model sees content, not Elementor
 * scaffolding. Preserves nesting structure — earlier versions tried to
 * flatten wrapper divs via non-greedy regex (`<(div|...)>([\s\S]*?)</\1>`)
 * but that match-the-FIRST-closing-tag behavior corrupts nested content
 * (chews up the workshop section, leaves orphaned closing tags). Safer to
 * keep the tags bare and let the model ignore them.
 */
function compactForAI(html: string): string {
  let out = html;
  out = out.replace(/<(script|style|svg|template|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  out = out.replace(/<([a-z0-9]+)\b([^>]*)>/gi, (_, tag: string, attrs: string) => {
    if (tag === "img") {
      const src =
        attrs.match(/\bsrc\s*=\s*"([^"]*)"/i)?.[1] ??
        attrs.match(/\bdata-src\s*=\s*"([^"]*)"/i)?.[1];
      if (!src) return "";
      const alt = attrs.match(/\balt\s*=\s*"([^"]*)"/i)?.[1];
      return `<img src="${src}"${alt ? ` alt="${alt}"` : ""}>`;
    }
    if (tag === "a") {
      const href = attrs.match(/\bhref\s*=\s*"([^"]*)"/i)?.[1];
      return href ? `<a href="${href}">` : `<a>`;
    }
    return `<${tag}>`;
  });
  out = out.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 5; i++) {
    const before = out;
    out = out.replace(/<(div|span|section|article|header|footer|main|aside|figure|figcaption|p)>\s*<\/\1>/gi, "");
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
        "You extract teacher info and a description from an Anamaya retreat web page. " +
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
        "- guest: labeled 'Special Guest', 'Guest Teacher', 'Featured Guest'. " +
        "- assistant: labeled 'Assistant', 'Co-host', or clearly subordinate billing. " +
        "Pull photo_url from the exact src= of an <img> visually associated with the teacher. " +
        "If you cannot confidently identify any teacher, return leaders: []. " +
        "" +
        "description_html: the main descriptive prose explaining what the retreat is about — overview / introduction paragraphs. " +
        "Wrap each paragraph in <p>…</p>. Preserve <strong>, <em>, <ul>/<li> if present. " +
        "EXCLUDE: teacher bios, pricing tables, dates/booking widgets, gallery captions, nav, footer, repeated CTAs. " +
        "Aim for 2–8 paragraphs.",
    },
    {
      role: "user",
      content: `Page title: ${input.title}\n\nPage HTML (cleaned):\n${compact}`,
    },
  ];

  const res = await runChat({
    modelRef: MODEL_REF,
    messages,
    maxTokens: 6000,
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

  if (leaders.length > 1 && !leaders.some((l) => l.role === "primary")) {
    leaders[0] = { ...leaders[0], role: "primary" };
  }

  const parsedObj = parsed as Record<string, unknown>;
  const descRaw = typeof parsedObj.description_html === "string" ? parsedObj.description_html.trim() : "";
  const description_html = descRaw.length > 0 ? descRaw : undefined;

  return { ok: true, leaders, description_html };
}

/**
 * Dedicated workshops extraction. A focused short prompt that asks ONLY
 * about workshops + pricing — combining with leaders/description in one
 * call caused gpt-4o-mini to consistently emit `workshops: []` even when
 * the page clearly had workshops, because the long leader bios + prose
 * earlier in the response saturated its attention.
 */
export async function extractRetreatWorkshopsAI(input: {
  title: string;
  bodyHtml: string;
}): Promise<AIWorkshopsResult> {
  const compact = compactForAI(input.bodyHtml);
  if (compact.length < 200) {
    return { ok: false, reason: "compacted body too short for AI extraction" };
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You extract OPTIONAL WORKSHOPS from an Anamaya retreat web page. " +
        "Return ONLY JSON in the form {\"workshops\": [...]}. No commentary. " +
        "" +
        "Each workshop object has: " +
        "title (string, required — e.g. 'THRIVE Workshop'), " +
        "description_html (string, optional — <p>…</p> body of the workshop blurb), " +
        "instructor_name (string, optional), " +
        "session_count (integer, optional — number of sessions in the series; 1 for a one-off), " +
        "session_duration_minutes (integer, optional — minutes per session, e.g. 90), " +
        "price_full (number, optional — full-series price in whole dollars, e.g. 60), " +
        "price_single (number, optional — per-single-session price, e.g. 35), " +
        "currency (string, optional — default 'USD'). " +
        "" +
        "Parse '(2 x 90 minutes sessions)' as session_count=2, session_duration_minutes=90. " +
        "Parse '$60 for two 90 minute sessions, or $35 for one session' as price_full=60, price_single=35. " +
        "Parse 'The price for this 90-min workshop is $60' as session_duration_minutes=90, price_full=60. " +
        "" +
        "INCLUDE: items presented as standalone optional workshops with their own price (typically under headings like 'Optional Workshops', 'Workshops', 'Extras with Pricing'). " +
        "EXCLUDE: the base retreat rate, excursions like surf lessons or zipline tours, yoga class packs, spa services. " +
        "If no workshops, return workshops: [].",
    },
    {
      role: "user",
      content: `Page title: ${input.title}\n\nPage HTML (cleaned):\n${compact}`,
    },
  ];

  const res = await runChat({
    modelRef: MODEL_REF,
    messages,
    maxTokens: 3000,
    responseFormat: "json",
  });
  if (!res.ok) return { ok: false, reason: res.reason };

  let parsed: unknown;
  try {
    parsed = JSON.parse(res.text);
  } catch {
    return { ok: false, reason: "AI response was not valid JSON" };
  }

  const parsedObj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const workshopsRaw = Array.isArray(parsedObj.workshops) ? (parsedObj.workshops as unknown[]) : [];
  const workshops: ExtractedWorkshop[] = [];
  for (const raw of workshopsRaw) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title.trim() : "";
    if (!title) continue;
    workshops.push({
      title,
      description_html: typeof r.description_html === "string" && r.description_html.trim() ? r.description_html.trim() : undefined,
      instructor_name: typeof r.instructor_name === "string" && r.instructor_name.trim() ? r.instructor_name.trim() : undefined,
      session_count: numOrUndef(r.session_count),
      session_duration_minutes: numOrUndef(r.session_duration_minutes),
      price_full: numOrUndef(r.price_full),
      price_single: numOrUndef(r.price_single),
      currency: typeof r.currency === "string" && r.currency.trim() ? r.currency.trim() : undefined,
    });
  }

  return { ok: true, workshops };
}

function numOrUndef(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.]/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}
