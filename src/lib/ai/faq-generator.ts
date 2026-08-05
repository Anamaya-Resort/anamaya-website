import "server-only";
import { buildPageContext } from "./retreat-recommender";

/**
 * FAQ drafter. Reads a page/post's own content and asks OpenAI to write a
 * short set of FAQs phrased the way a real prospective guest would ask —
 * because question-shaped, page-specific content is exactly what the AI
 * answer engines (and Google) match and quote.
 *
 * Grounded, not inventive: the model is told to answer ONLY from the page's
 * content and to skip anything it can't support, so it won't fabricate
 * prices, policies, or dates. Output is still a DRAFT for admin review
 * before it's approved/published.
 *
 * Throws on failure (no key, API error, bad JSON) — callers decide whether
 * to surface the error or skip.
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
  "You are given the text of ONE page or post. Produce FAQs that a real prospective guest would type into Google or ask an AI assistant about THIS page's topic.",
  "Rules:",
  "- Answer ONLY from the provided page content. If the page doesn't support an answer, do not include that question. Never invent prices, dates, policies, or facts.",
  "- Questions must sound like a real person ('Does the room have air conditioning?', 'How do I get there from the airport?'), not like a heading.",
  "- Answers: 1-3 sentences, warm and direct, no fluff. Do not restate the question.",
  "- Write 6 to 9 FAQs. Mark the 3 most valuable / most-asked as featured.",
  "- No duplicate or near-duplicate questions.",
].join("\n");

type ChatResponse = {
  choices?: { message?: { content?: string } }[];
};

/**
 * Draft FAQs for a page from its content. `extraPrompt` lets an admin steer
 * the run ("focus on travel logistics", "emphasise solo travellers").
 */
export async function generateFaqDraft(
  pageId: string,
  opts?: { extraPrompt?: string },
): Promise<FaqDraft[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const context = await buildPageContext(pageId);
  if (!context || context.length < 40) {
    throw new Error("Not enough page content to draft FAQs from");
  }

  const steer = (opts?.extraPrompt ?? "").trim();
  const userContent = [
    steer ? `Extra instructions from the editor: ${steer}` : "",
    "PAGE CONTENT:",
    context,
    "",
    'Return JSON of the exact shape: {"faqs":[{"question":"...","answer":"...","featured":true|false}]}',
  ]
    .filter(Boolean)
    .join("\n");

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
        { role: "system", content: SYSTEM_PROMPT },
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
    throw new Error("FAQ draft was not valid JSON");
  }

  const faqs = Array.isArray(parsed.faqs) ? parsed.faqs : [];
  const cleaned: FaqDraft[] = faqs
    .map((f) => ({
      question: (f.question ?? "").trim(),
      answer: (f.answer ?? "").trim(),
      is_featured: f.featured === true,
    }))
    .filter((f) => f.question && f.answer);

  // Safety net: if the model marked none (or too many) as featured, keep the
  // first three as the always-visible set.
  const featuredCount = cleaned.filter((f) => f.is_featured).length;
  if (cleaned.length && (featuredCount === 0 || featuredCount > 5)) {
    cleaned.forEach((f, i) => (f.is_featured = i < 3));
  }

  return cleaned;
}
