import { NextResponse } from "next/server";

/**
 * Placeholder for the block-editor AI rewrite / translate feature.
 * The <AiRewriteModal> in the rich-text editor posts to this endpoint
 * with:
 *   { kind: "rewrite" | "translate",
 *     prompt: string,
 *     currentHtml: string,
 *     targetLanguage?: string }
 *
 * When the user's internal LLM module is ready, replace the body of
 * POST() with:
 *   1. Authorise the caller (admin session) — similar to other admin
 *      routes in this app.
 *   2. Compose a chat-completion request that preserves HTML structure
 *      and only rewrites visible text.
 *   3. Send to the chosen provider (ChatGPT / Claude / Grok) — read
 *      provider + API keys from env.
 *   4. Return { html } with the same shape as the input, only text
 *      changed.
 *
 * Until then, a 503 keeps the modal's error state visible so the
 * feature's UI can still be exercised safely in production without
 * ever mutating content.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "AI module not yet configured. The LLM backend (ChatGPT/Claude/Grok) hasn't been wired up — this endpoint is a placeholder. See /src/app/api/ai/rewrite/route.ts.",
    },
    { status: 503 },
  );
}
