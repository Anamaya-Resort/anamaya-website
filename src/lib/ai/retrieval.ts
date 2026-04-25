import "server-only";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import { embedText } from "./embeddings";

/**
 * Vector retrieval for Tool 3 (visitor agent). Embeds the query, asks
 * Postgres for top-K nearest content_chunks via the match_content_chunks
 * RPC, returns rows ready for prompt assembly.
 */

export type RetrievedChunk = {
  id: string;
  sourceKind: string;
  sourceId: string | null;
  urlPath: string | null;
  title: string | null;
  content: string;
  similarity: number;
};

export type SearchOptions = {
  matchThreshold?: number;
  matchCount?: number;
  propertyId?: string | null;
};

export async function searchChunks(
  query: string,
  opts: SearchOptions = {},
): Promise<RetrievedChunk[]> {
  const sb = supabaseServerOrNull();
  if (!sb) return [];

  const trimmed = query.trim();
  if (!trimmed) return [];

  const { embedding } = await embedText(trimmed);

  const { data, error } = await sb.rpc("match_content_chunks", {
    query_embedding: embedding,
    match_threshold: opts.matchThreshold ?? 0.65,
    match_count: opts.matchCount ?? 8,
    filter_property_id: opts.propertyId ?? null,
  });

  if (error) {
    // Don't crash the agent — let it answer without retrieval rather
    // than hard-failing the visitor's question.
    console.warn("[ai/retrieval] match_content_chunks failed:", error.message);
    return [];
  }

  type Row = {
    id: string;
    source_kind: string;
    source_id: string | null;
    url_path: string | null;
    title: string | null;
    content: string;
    similarity: number;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    sourceKind: r.source_kind,
    sourceId: r.source_id,
    urlPath: r.url_path,
    title: r.title,
    content: r.content,
    similarity: r.similarity,
  }));
}
