import "server-only";
import { buildPageContext } from "./retreat-recommender";
import { getFaqKnowledge } from "@/lib/website-builder/settings";
import { getAOAIContext } from "@/lib/ao-ai-context";
import type { AOBrandGuide, AOArchetype } from "@/types/ao-ai";

/**
 * FAQ drafter. Asks OpenAI to write a short set of FAQs phrased the way a real
 * prospective guest would ask — question-shaped, on-brand content is exactly
 * what AI answer engines (and Google) match and quote.
 *
 * Grounded, not inventive: the model answers only from the reference material
 * and any provided page/article content, and skips anything it can't support,
 * so it won't fabricate prices, policies, or dates. Output is a DRAFT for admin
 * review before it's approved/published.
 *
 * Two entry points share one LLM core (draftFaqsFromContent):
 *   - generateFaqDraft(pageId): grounded in ONE page's content (per-article
 *     panel in the page editor).
 *   - the standalone builder assembles its own reference + content from the
 *     sources the user ticks, then calls draftFaqsFromContent directly.
 */

const MODEL = "gpt-4o-mini";
export const FAQ_MODEL_REF = `openai:${MODEL}`;

export type FaqDraft = {
  question: string;
  answer: string;
  is_featured: boolean;
};

const SYSTEM_PROMPT = [
  "You write concise, accurate FAQs for a wellness/yoga retreat resort's website.",
  "You are given REFERENCE material about the business (brand voice, customer avatars, general info, and an existing FAQ library), and optionally the text of one or more pages/articles.",
  "Produce FAQs that a real prospective guest would type into Google or ask an AI assistant.",
  "Rules:",
  "- Answer using the REFERENCE material and any provided content. Do not invent prices, dates, policies, or facts that none of them support; skip a question rather than guess.",
  "- Prefer the wording and answers from the REFERENCE info / FAQ library when they apply — they are authoritative.",
  "- Match the BRAND VOICE, and phrase questions the way the described CUSTOMER AVATARS would ask them.",
  "- Questions must sound like a real person ('Does the room have air conditioning?', 'How do I get there from the airport?'), not like a heading.",
  "- Answers: 1-3 sentences, warm and direct, no fluff. Do not restate the question.",
  "- Write 6 to 9 FAQs unless the instructions say otherwise. Mark the 3 most valuable / most-asked as featured.",
  "- No duplicate or near-duplicate questions.",
].join("\n");

type ChatResponse = {
  choices?: { message?: { content?: string } }[];
};

/** Trim a reference field so the assembled prompt stays bounded. */
export function cap(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) : s;
}

/** Brand voice from an AnamayOS brand guide, as prompt text. */
export function formatAoBrand(guide: AOBrandGuide | undefined | null): string {
  if (!guide) return "";
  if (guide.compiled_context) return cap(guide.compiled_context, 4000);
  return cap(
    [
      guide.voice_tone && `Voice/tone: ${guide.voice_tone}`,
      guide.personality_traits?.length &&
        `Personality: ${guide.personality_traits.join(", ")}`,
      guide.dos_and_donts &&
        `Do: ${(guide.dos_and_donts.dos ?? []).join("; ")}. Don't: ${(guide.dos_and_donts.donts ?? []).join("; ")}.`,
    ]
      .filter(Boolean)
      .join("\n"),
    4000,
  );
}

/** Customer avatars from AnamayOS archetypes, as prompt text. */
export function formatAoAvatars(archetypes: AOArchetype[]): string {
  return (archetypes ?? [])
    .map((a) =>
      [
        `- ${a.name}${a.description ? `: ${a.description}` : ""}`,
        a.motivations?.length ? `  wants: ${a.motivations.join(", ")}` : "",
        a.pain_points?.length ? `  worries: ${a.pain_points.join(", ")}` : "",
        a.content_tone ? `  tone: ${a.content_tone}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
}

const REFINE_SYSTEM_PROMPT = [
  "You revise an existing list of website FAQs for a wellness/yoga retreat resort.",
  "You are given the current FAQs (numbered) and an instruction from the editor.",
  "Apply the instruction, then return the FULL list in the same order.",
  "Rules:",
  "- Change ONLY what the instruction asks. Leave every other FAQ exactly as-is, word for word, including its featured flag.",
  "- Keep answers accurate — do not invent prices, dates, or policies. Keep the warm, direct brand voice.",
  "- Do not add or remove FAQs unless the instruction says to.",
].join("\n");

/**
 * Shared LLM call: send a system prompt + user message, parse the JSON FAQ
 * list. `featuredSafetyNet` forces the first three featured when the model
 * marks none/too many — used for fresh generation, NOT refine (which must
 * preserve the editor's featured flags). Throws on failure.
 */
async function runFaqCompletion(
  systemPrompt: string,
  userContent: string,
  featuredSafetyNet = true,
): Promise<FaqDraft[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenAI chat ${res.status}: ${err.slice(0, 300) || res.statusText}`);
  }

  const json = (await res.json()) as ChatResponse;
  const raw = json.choices?.[0]?.message?.content ?? "";
  let parsed: { faqs?: { question?: string; answer?: string; featured?: boolean }[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("FAQ response was not valid JSON");
  }

  const faqs = Array.isArray(parsed.faqs) ? parsed.faqs : [];
  const cleaned: FaqDraft[] = faqs
    .map((f) => ({
      question: (f.question ?? "").trim(),
      answer: (f.answer ?? "").trim(),
      is_featured: f.featured === true,
    }))
    .filter((f) => f.question && f.answer);

  if (featuredSafetyNet) {
    const featuredCount = cleaned.filter((f) => f.is_featured).length;
    if (cleaned.length && (featuredCount === 0 || featuredCount > 5)) {
      cleaned.forEach((f, i) => (f.is_featured = i < 3));
    }
  }
  return cleaned;
}

/**
 * Fresh generation: assemble the user message from reference + content + steer.
 */
export async function draftFaqsFromContent(opts: {
  referenceText?: string;
  contentText?: string;
  extraPrompt?: string;
}): Promise<FaqDraft[]> {
  const steer = (opts.extraPrompt ?? "").trim();
  const userContent = [
    steer ? `INSTRUCTIONS FROM THE EDITOR:\n${steer}` : "",
    opts.referenceText || "",
    opts.contentText ? `PAGE / ARTICLE CONTENT:\n${opts.contentText}` : "",
    'Return JSON of the exact shape: {"faqs":[{"question":"...","answer":"...","featured":true|false}]}',
  ]
    .filter(Boolean)
    .join("\n\n");
  return runFaqCompletion(SYSTEM_PROMPT, userContent, true);
}

/**
 * Refine an existing list: apply the editor's instruction (e.g. "fix #5 and #7
 * to include our brand name") and return the FULL revised list, leaving
 * untouched FAQs word-for-word. Featured flags are preserved.
 */
export async function refineFaqDrafts(opts: {
  items: { question: string; answer: string; is_featured: boolean }[];
  instruction: string;
}): Promise<FaqDraft[]> {
  const instruction = (opts.instruction ?? "").trim();
  if (!instruction) throw new Error("Add an instruction to refine with");
  const current = opts.items
    .map(
      (f, i) =>
        `${i + 1}. [${f.is_featured ? "featured" : "not featured"}]\n   Q: ${f.question}\n   A: ${f.answer}`,
    )
    .join("\n");
  const userContent = [
    "CURRENT FAQS (numbered):",
    current,
    `INSTRUCTION: ${instruction}`,
    'Return the FULL revised list in order as JSON {"faqs":[{"question":"...","answer":"...","featured":true|false}]}.',
  ].join("\n\n");
  return runFaqCompletion(REFINE_SYSTEM_PROMPT, userContent, false);
}

/** The full brand reference (AO brand + avatars + knowledge notes), as used by
 *  the per-article generator. */
async function buildFullReference(): Promise<string> {
  const [knowledge, ao] = await Promise.all([
    getFaqKnowledge(),
    getAOAIContext(),
  ]);
  const aoBrand = formatAoBrand(ao.guides[0]);
  const aoAvatars = formatAoAvatars(
    (ao.archetypes ?? []).filter((a) => a.is_active !== false),
  );
  return [
    aoBrand && `BRAND VOICE (from AnamayOS — match this):\n${aoBrand}`,
    aoAvatars &&
      `CUSTOMER AVATARS (from AnamayOS — phrase questions the way these people ask):\n${cap(aoAvatars, 4000)}`,
    knowledge.brand_vibe &&
      `BRAND & VIBE (extra notes):\n${cap(knowledge.brand_vibe, 3000)}`,
    knowledge.customer_avatars &&
      `CUSTOMER AVATARS (extra notes):\n${cap(knowledge.customer_avatars, 3000)}`,
    knowledge.info &&
      `REFERENCE INFO (authoritative facts):\n${cap(knowledge.info, 6000)}`,
    knowledge.faq_content &&
      `EXISTING FAQ LIBRARY (reuse/adapt the relevant ones):\n${cap(knowledge.faq_content, 6000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Draft FAQs for a specific page/post, grounded in its own content plus the
 * live brand reference. `extraPrompt` lets an admin steer the run.
 */
export async function generateFaqDraft(
  pageId: string,
  opts?: { extraPrompt?: string },
): Promise<FaqDraft[]> {
  const context = await buildPageContext(pageId);
  if (!context || context.length < 40) {
    throw new Error("Not enough page content to draft FAQs from");
  }
  const referenceText = await buildFullReference();
  return draftFaqsFromContent({
    referenceText,
    contentText: context,
    extraPrompt: opts?.extraPrompt,
  });
}
