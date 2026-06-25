import "server-only";
import { cache } from "react";
import { aoSupabaseAdminOrNull } from "@/lib/ao-supabase";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import { embedText, embedBatch } from "./embeddings";
import type { RetreatCardData } from "@/components/blocks/RetreatCard";

/**
 * Semantic retreat recommender. Given a query (a search phrase the
 * builder typed, or the text of the current page/post), returns the
 * most contextually-relevant upcoming retreats — a far better match
 * than keyword search because it compares *meaning*, not words.
 *
 * How it works:
 *   1. Candidate retreats = public + active + future-end, from AO.
 *   2. Each retreat's text (name + excerpt + description) is embedded
 *      once with OpenAI and cached in the website DB (retreat_embeddings),
 *      re-embedded only when its text changes (content_hash).
 *   3. The query is embedded at request time and ranked against the
 *      cached retreat vectors by cosine similarity; top N are returned.
 *
 * Fully best-effort: any failure (no OpenAI key, AO down, table missing)
 * returns [] so the block renders an empty state rather than crashing.
 */

export type RankedRetreat = RetreatCardData & { similarity: number };

const RETREAT_COLS =
  "id, name, excerpt, description, start_date, end_date, feature_image_url, images, website_slug, registration_link, external_link";

type AoRetreatRow = RetreatCardData;

/** Candidate retreats (public/active/upcoming). Cached per request. */
const getCandidateRetreats = cache(async (): Promise<AoRetreatRow[]> => {
  const ao = aoSupabaseAdminOrNull();
  if (!ao) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await ao
    .from("retreats")
    .select(RETREAT_COLS)
    .eq("is_public", true)
    .eq("is_active", true)
    .gte("end_date", today)
    .order("start_date", { ascending: true })
    .limit(300);
  if (error) return [];
  return (data ?? []) as AoRetreatRow[];
});

/** Text we embed for a retreat — name + excerpt + description, de-HTML'd. */
function retreatText(r: AoRetreatRow): string {
  return [r.name, r.excerpt, r.description]
    .filter(Boolean)
    .join("\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);
}

/** Small, stable, dependency-free hash for change detection (djb2). */
function hashText(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Ensure each candidate retreat has a current embedding in the website
 * DB and return them as a map. Embeds only the ones whose text is new or
 * changed (one batched OpenAI call), then upserts.
 */
async function ensureEmbeddings(
  retreats: AoRetreatRow[],
): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  const sb = supabaseServerOrNull();
  if (!sb || retreats.length === 0) return map;

  const ids = retreats.map((r) => r.id);
  const { data: existing } = await sb
    .from("retreat_embeddings")
    .select("retreat_id, content_hash, embedding")
    .in("retreat_id", ids);
  const byId = new Map(
    ((existing ?? []) as {
      retreat_id: string;
      content_hash: string | null;
      embedding: unknown;
    }[]).map((e) => [e.retreat_id, e]),
  );

  const toEmbed: { id: string; text: string; hash: string }[] = [];
  for (const r of retreats) {
    const text = retreatText(r);
    if (!text) continue;
    const hash = hashText(text);
    const ex = byId.get(r.id);
    if (
      ex &&
      ex.content_hash === hash &&
      Array.isArray(ex.embedding) &&
      ex.embedding.length > 0
    ) {
      map.set(r.id, ex.embedding as number[]);
    } else {
      toEmbed.push({ id: r.id, text, hash });
    }
  }

  if (toEmbed.length > 0) {
    try {
      const results = await embedBatch(toEmbed.map((t) => t.text));
      const rows = toEmbed.map((t, i) => ({
        retreat_id: t.id,
        content_hash: t.hash,
        embedding: results[i].embedding,
        embedded_at: new Date().toISOString(),
      }));
      toEmbed.forEach((t, i) => map.set(t.id, results[i].embedding));
      await sb.from("retreat_embeddings").upsert(rows, { onConflict: "retreat_id" });
    } catch (e) {
      console.warn("[retreat-recommender] embed failed:", (e as Error).message);
    }
  }
  return map;
}

/**
 * Rank upcoming retreats by semantic relevance to `queryText` and return
 * the top `count`. Returns [] on empty query or any failure.
 */
export async function recommendRetreats(
  queryText: string,
  count: number,
): Promise<RankedRetreat[]> {
  const trimmed = (queryText ?? "").trim();
  if (!trimmed) return [];

  const retreats = await getCandidateRetreats();
  if (retreats.length === 0) return [];

  let queryVec: number[];
  try {
    queryVec = (await embedText(trimmed.slice(0, 6000))).embedding;
  } catch (e) {
    console.warn("[retreat-recommender] query embed failed:", (e as Error).message);
    return [];
  }

  const embMap = await ensureEmbeddings(retreats);
  if (embMap.size === 0) return [];

  return retreats
    .filter((r) => embMap.has(r.id))
    .map((r) => ({ ...r, similarity: cosine(queryVec, embMap.get(r.id)!) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.max(1, count));
}

/**
 * Build a context string from a page/post for "use page content" mode:
 * its title + excerpt + body, de-HTML'd and truncated. Cached per request.
 */
export const buildPageContext = cache(async (pageId: string): Promise<string> => {
  const sb = supabaseServerOrNull();
  if (!sb || !pageId) return "";
  const [{ data: row }, { data: content }] = await Promise.all([
    sb.from("url_inventory").select("title, excerpt").eq("id", pageId).maybeSingle(),
    sb
      .from("content_items")
      .select("cms_body_html, content_rendered, scraped_body_html")
      .eq("url_inventory_id", pageId)
      .maybeSingle(),
  ]);
  const body =
    content?.cms_body_html ??
    content?.content_rendered ??
    content?.scraped_body_html ??
    "";
  return [row?.title, row?.excerpt, body]
    .filter(Boolean)
    .join("\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);
});
