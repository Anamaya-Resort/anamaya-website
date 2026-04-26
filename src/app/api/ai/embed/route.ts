import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSessionUser, isAdminUser } from "@/lib/session";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import {
  embedBatch,
  EMBEDDING_MODEL_REF,
} from "@/lib/ai/embeddings";
import { chunkText, htmlToPlainText } from "@/lib/ai/chunking";

/**
 * Cursor-paginated backfill for the content_chunks vector store.
 *
 * One POST processes up to BATCH_SIZE inventory rows. The client polls
 * with the returned `nextCursor` until { done: true }. This keeps each
 * call well under serverless time limits, yet trivially resumable.
 *
 * Bodies are hashed before any embedding work so unchanged rows are a
 * no-op on subsequent runs (idempotent + cheap).
 */

const BATCH_SIZE = 25;
const SOURCE_SITE = "v2";
const PUBLIC_STATUSES = ["publish", "private"];

type RunResult = {
  ok: true;
  done: boolean;
  nextCursor: string | null;
  processed: number;
  embedded: number;
  skipped: number;
  chunksWritten: number;
  errors: { id: string; reason: string }[];
};

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!isAdminUser(user)) {
    return NextResponse.json(
      { ok: false, reason: "Unauthorized" },
      { status: 401 },
    );
  }

  const sb = supabaseServerOrNull();
  if (!sb) {
    return NextResponse.json(
      { ok: false, reason: "Supabase not configured on the website." },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor"); // last processed url_inventory.id
  const force = url.searchParams.get("force") === "true";

  // Stable cursor order: id ascending. We process in batches of BATCH_SIZE
  // so each call finishes quickly even on cold-start serverless.
  let q = sb
    .from("url_inventory")
    .select(
      "id, title, url_path, property_id, scraped_body_html",
      { count: undefined },
    )
    .eq("source_site", SOURCE_SITE)
    .eq("url_kind", "content")
    .in("wp_status", PUBLIC_STATUSES)
    .order("id", { ascending: true })
    .limit(BATCH_SIZE);
  if (cursor) q = q.gt("id", cursor);
  const { data: rows, error: rowsErr } = await q;
  if (rowsErr) {
    return NextResponse.json(
      { ok: false, reason: rowsErr.message },
      { status: 500 },
    );
  }

  const result: RunResult = {
    ok: true,
    done: false,
    nextCursor: null,
    processed: 0,
    embedded: 0,
    skipped: 0,
    chunksWritten: 0,
    errors: [],
  };

  if (!rows || rows.length === 0) {
    result.done = true;
    return NextResponse.json(result);
  }

  // Need cms_body_html / content_rendered which live on content_items.
  const ids = rows.map((r) => r.id);
  const { data: contentRows } = await sb
    .from("content_items")
    .select("url_inventory_id, cms_body_html, content_rendered")
    .in("url_inventory_id", ids);
  const contentById = new Map(
    (contentRows ?? []).map((c) => [c.url_inventory_id, c]),
  );

  for (const row of rows) {
    result.processed += 1;
    try {
      const content = contentById.get(row.id);
      const rawBody =
        content?.cms_body_html ??
        content?.content_rendered ??
        row.scraped_body_html ??
        "";
      const plain = htmlToPlainText(rawBody);
      if (plain.trim().length < 50) {
        // Page has no substantive prose — drop any stale chunks and skip.
        await sb
          .from("content_chunks")
          .delete()
          .eq("source_kind", "inventory")
          .eq("source_id", row.id);
        result.skipped += 1;
        continue;
      }

      const sourceHash = sha256(plain);

      if (!force) {
        const { data: existing } = await sb
          .from("content_chunks")
          .select("source_hash")
          .eq("source_kind", "inventory")
          .eq("source_id", row.id)
          .limit(1)
          .maybeSingle();
        if (existing && existing.source_hash === sourceHash) {
          result.skipped += 1;
          continue;
        }
      }

      const chunks = chunkText(plain);
      if (chunks.length === 0) {
        result.skipped += 1;
        continue;
      }

      const embeddings = await embedBatch(chunks);

      // Upsert the new chunks first, then delete any leftover indices.
      // This way a failed insert leaves the old set intact rather than
      // taking the page offline from retrieval until the next run.
      const inserts = chunks.map((content, idx) => ({
        source_kind: "inventory",
        source_id: row.id,
        property_id: row.property_id ?? null,
        url_path: row.url_path,
        title: row.title,
        chunk_index: idx,
        content,
        embedding: embeddings[idx].embedding,
        token_count: embeddings[idx].tokenCount,
        embedded_with: EMBEDDING_MODEL_REF,
        source_hash: sourceHash,
      }));

      const { error: upsertErr } = await sb
        .from("content_chunks")
        .upsert(inserts, {
          onConflict: "source_kind,source_id,chunk_index",
        });
      if (upsertErr) throw new Error(upsertErr.message);

      // Drop any chunks at indices the new run no longer produces (body
      // got shorter). This must come AFTER upsert to keep retrieval live.
      const { error: trimErr } = await sb
        .from("content_chunks")
        .delete()
        .eq("source_kind", "inventory")
        .eq("source_id", row.id)
        .gte("chunk_index", chunks.length);
      if (trimErr) throw new Error(trimErr.message);

      result.embedded += 1;
      result.chunksWritten += chunks.length;
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      result.errors.push({ id: row.id, reason });
    }
  }

  const last = rows[rows.length - 1];
  result.nextCursor = last?.id ?? null;
  result.done = rows.length < BATCH_SIZE;
  return NextResponse.json(result);
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}
