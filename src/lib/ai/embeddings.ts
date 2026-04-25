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
  // OpenAI guarantees order of `data` matches input order.
  return items.map((d) => {
    if (!Array.isArray(d.embedding) || d.embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error("Embedding response shape unexpected");
    }
    return {
      embedding: d.embedding,
      // OpenAI only returns total usage; spread it evenly so per-chunk
      // accounting is approximate but consistent.
      tokenCount: Math.round(totalTokens / items.length),
    };
  });
}
