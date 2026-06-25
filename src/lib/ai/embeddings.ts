import "server-only";

/**
 * Thin wrapper around OpenAI embeddings. text-embedding-3-small is the
 * default — 1536 dims, $0.02/M tokens, good enough for site-content
 * retrieval. Switching dimension means migrating content_chunks.embedding
 * (vector(N)), so changes here are coordinated.
 */

const DEFAULT_MODEL = "text-embedding-3-small";

export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_MODEL_REF = `openai:${DEFAULT_MODEL}`;

export type EmbeddingResult = {
  embedding: number[];
  tokenCount: number;
};

/**
 * Embed a single text. Throws on failure — callers decide whether to
 * abort the whole batch or skip and continue.
 */
export async function embedText(text: string): Promise<EmbeddingResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: text,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings ${res.status}: ${err.slice(0, 300) || res.statusText}`);
  }

  const json = (await res.json()) as {
    data?: { embedding?: number[] }[];
    usage?: { prompt_tokens?: number };
  };
  const embedding = json.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("Embedding response shape unexpected");
  }

  return {
    embedding,
    tokenCount: json.usage?.prompt_tokens ?? 0,
  };
}

/**
 * Batch embed. OpenAI accepts `input` as a string array. We chunk to
 * stay under the 8192-token-per-input limit conservatively — callers
 * should already be passing pre-chunked text.
 */
export async function embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
  if (texts.length === 0) return [];
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: texts,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings ${res.status}: ${err.slice(0, 300) || res.statusText}`);
  }

  const json = (await res.json()) as {
    data?: { embedding?: number[]; index?: number }[];
    usage?: { prompt_tokens?: number };
  };
  const items = json.data ?? [];
  const totalTokens = json.usage?.prompt_tokens ?? 0;
  if (items.length !== texts.length) {
    throw new Error(
      `Embedding response count mismatch: got ${items.length}, expected ${texts.length}`,
    );
  }
  // Place each embedding at its returned `index` rather than trusting the
  // array order — callers pair results to inputs positionally, so an
  // out-of-order or partial response would otherwise silently attach the
  // wrong vector to the wrong input.
  const out: EmbeddingResult[] = new Array(texts.length);
  // OpenAI only returns total usage; spread it evenly so per-item
  // accounting is approximate but consistent.
  const perItemTokens = Math.round(totalTokens / items.length);
  for (const d of items) {
    if (!Array.isArray(d.embedding) || d.embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error("Embedding response shape unexpected");
    }
    const idx = typeof d.index === "number" ? d.index : -1;
    if (idx < 0 || idx >= texts.length) {
      throw new Error(`Embedding response index out of range: ${idx}`);
    }
    out[idx] = { embedding: d.embedding, tokenCount: perItemTokens };
  }
  for (let i = 0; i < out.length; i++) {
    if (!out[i]) throw new Error(`Embedding response missing index ${i}`);
  }
  return out;
}
