"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { decode, extractRetreat, type ExtractedRetreat } from "./retreat-extractor";
import { extractRetreatBodyAI, extractRetreatWorkshopsAI } from "./retreat-ai-extractor";
import { importImage, type ImageBucket, type SkippedImage } from "./images";
import { pushStagedRetreatToAO, type PushResult } from "./push";
import { getSessionUser } from "@/lib/session";

const WP_HOSTS = ["anamayastg.wpenginepowered.com", "anamaya.com"];

type ExtractOutcome = {
  url_inventory_id: string;
  retreat_imports_id: string;
  warnings: string[];
  image_summary: {
    imported: number;
    reused: number;
    skipped: number;
    skipped_details: SkippedImage[];
  };
};

/**
 * Extract a single WP retreat into staging. Pulls scraped HTML from the
 * website-side `content_items` table, runs the extractor, imports any
 * referenced WP images into AO Storage (deduped by sha256), and stages
 * the result in `retreat_imports.extracted_json`.
 *
 * Idempotent: rerunning on the same `url_inventory_id` updates the
 * staged row in place. Image uploads are reused via source_hash, so
 * reruns don't duplicate storage.
 */
export async function extractRetreatToStaging(url_inventory_id: string): Promise<ExtractOutcome> {
  const sb = supabaseServer();

  const { data: invRow, error: invErr } = await sb
    .from("url_inventory")
    .select("id, url, title, post_type")
    .eq("id", url_inventory_id)
    .maybeSingle();
  if (invErr) throw new Error(`url_inventory: ${invErr.message}`);
  if (!invRow) throw new Error("url_inventory row not found");
  if (invRow.post_type !== "retreat") {
    throw new Error(`expected post_type=retreat, got ${invRow.post_type}`);
  }

  const { data: ci } = await sb
    .from("content_items")
    .select("scraped_body_html")
    .eq("url_inventory_id", url_inventory_id)
    .maybeSingle();

  const bodyHtml: string =
    (ci as { scraped_body_html?: string } | null)?.scraped_body_html ?? "";

  const { retreat, warnings } = extractRetreat({
    title: invRow.title ?? "",
    url: invRow.url ?? "",
    bodyHtml,
    sourceHosts: WP_HOSTS,
  });

  // AI-based body extraction. Two parallel calls: one for leaders +
  // description, one for workshops. (Combining them into a single call
  // caused gpt-4o-mini to drop the workshops field after generating long
  // leader bios.) Both fall back to regex if their call fails.
  if (bodyHtml.length >= 500) {
    const [aiBody, aiWorkshops] = await Promise.all([
      extractRetreatBodyAI({ title: invRow.title ?? "", bodyHtml }),
      extractRetreatWorkshopsAI({ title: invRow.title ?? "", bodyHtml }),
    ]);

    if (aiBody.ok) {
      if (aiBody.leaders.length > 0) {
        retreat.retreat_leaders = aiBody.leaders;
        const idx = warnings.indexOf("could not identify retreat leader/teacher");
        if (idx !== -1) warnings.splice(idx, 1);
        const missingBio = aiBody.leaders.filter((l) => !l.bio_html?.trim()).map((l) => l.name);
        if (missingBio.length > 0) {
          warnings.push(
            `bio missing for ${missingBio.length} leader(s): ${missingBio.join(", ")} — re-extract; gpt-4o-mini occasionally drops bio_html`,
          );
        }
      }
      if (aiBody.description_html) {
        retreat.description_html = aiBody.description_html;
        retreat.description_text = aiBody.description_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
    } else {
      warnings.push(`AI body extraction failed: ${aiBody.reason}`);
    }

    if (aiWorkshops.ok) {
      // Empty AI workshops still wins — the regex fallback at best returns
      // a stray description sentence under a "workshop" heading, which is
      // worse than nothing.
      retreat.workshops = aiWorkshops.workshops;
    } else {
      warnings.push(`AI workshops extraction failed: ${aiWorkshops.reason}`);
    }

    retreat.ai_status = {
      ok: aiBody.ok && aiWorkshops.ok,
      reason: aiBody.ok && aiWorkshops.ok
        ? undefined
        : [aiBody.ok ? null : `body: ${aiBody.reason}`, aiWorkshops.ok ? null : `workshops: ${aiWorkshops.reason}`]
            .filter(Boolean)
            .join("; "),
      leaders_count: aiBody.ok ? aiBody.leaders.length : 0,
      workshops_count: aiWorkshops.ok ? aiWorkshops.workshops.length : 0,
      description_present: aiBody.ok ? Boolean(aiBody.description_html) : false,
      model: "openai:gpt-4o-mini",
    };
  } else {
    retreat.ai_status = { ok: false, reason: "scraped HTML too short — AI skipped" };
  }

  const imagePlan: { url: string; bucket: ImageBucket; pathPrefix: string; alt?: string }[] = [];
  const galleryPrefix = `staging/${url_inventory_id}/gallery`;
  for (const img of retreat.gallery_images) {
    imagePlan.push({ url: img.url, bucket: "retreat-media", pathPrefix: galleryPrefix, alt: img.alt });
  }
  for (const leader of retreat.retreat_leaders) {
    if (!leader.photo_url) continue;
    imagePlan.push({
      url: leader.photo_url,
      bucket: "retreat-leader-photos",
      pathPrefix: `staging/${url_inventory_id}/leader`,
    });
  }

  let imported = 0;
  let reused = 0;
  let skipped = 0;
  const skipped_details: SkippedImage[] = [];
  const urlMap = new Map<string, string>();

  for (const item of imagePlan) {
    const result = await importImage({
      sourceUrl: item.url,
      bucket: item.bucket,
      pathPrefix: item.pathPrefix,
      altText: item.alt,
    });
    if (result.ok) {
      urlMap.set(item.url, result.image.ao_public_url);
      if (result.image.reused) reused++;
      else imported++;
    } else {
      skipped++;
      skipped_details.push(result.skipped);
      if (result.skipped.reason !== "denylist") {
        warnings.push(`image ${result.skipped.reason}: ${item.url} — ${result.skipped.detail ?? ""}`);
      }
    }
  }

  // Substitute AO Storage URLs in-place so the staged record references
  // the imported images (not the WP originals).
  const rewritten: ExtractedRetreat = {
    ...retreat,
    gallery_images: retreat.gallery_images
      .map((g) => ({ ...g, url: urlMap.get(g.url) ?? g.url }))
      .filter((g) => urlMap.has(g.url) || g.url.startsWith("http") === false || !WP_HOSTS.some((h) => g.url.includes(h))),
    retreat_leaders: retreat.retreat_leaders.map((l) => ({
      ...l,
      photo_url: l.photo_url ? urlMap.get(l.photo_url) ?? l.photo_url : undefined,
    })),
  };

  const { data: existing } = await sb
    .from("retreat_imports")
    .select("id")
    .eq("url_inventory_id", url_inventory_id)
    .maybeSingle();

  const row = {
    url_inventory_id,
    url_path: invRow.url ?? "",
    title: invRow.title ? decode(invRow.title) : null,
    extracted_json: rewritten as unknown as Record<string, unknown>,
    warnings,
    status: "pending_review" as const,
    failure_reason: null,
    updated_at: new Date().toISOString(),
  };

  let retreatImportsId: string;
  if (existing?.id) {
    const { error } = await sb.from("retreat_imports").update(row).eq("id", existing.id);
    if (error) throw new Error(`retreat_imports update: ${error.message}`);
    retreatImportsId = existing.id;
  } else {
    const { data, error } = await sb
      .from("retreat_imports")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(`retreat_imports insert: ${error.message}`);
    retreatImportsId = data.id;
  }

  revalidatePath("/admin/retreat-imports");

  return {
    url_inventory_id,
    retreat_imports_id: retreatImportsId,
    warnings,
    image_summary: { imported, reused, skipped, skipped_details },
  };
}

/**
 * Approve and push a staged retreat into AnamayOS. Idempotent on
 * `retreat_imports.ao_retreat_id`: re-pushing updates the existing AO
 * retreat in place (replaces pricing-tier and gallery-media child rows).
 *
 * Original WP-side data (url_inventory, content_items, media_items) is
 * never touched.
 */
export async function pushStagedRetreat(
  retreat_imports_id: string,
): Promise<PushResult> {
  const user = await getSessionUser();
  const result = await pushStagedRetreatToAO(retreat_imports_id, user?.email ?? null);
  revalidatePath("/admin/retreat-imports");
  revalidatePath(`/admin/retreat-imports/${retreat_imports_id}`);
  return result;
}

/**
 * Wipe ALL staged retreat_imports rows so a fresh extract pass starts
 * from a clean slate. Leaves AO retreat data alone (admin cleans those
 * separately if needed) and leaves image_imports alone so sha256 dedupe
 * still saves storage on re-runs.
 *
 * Intended for the testing/tuning phase only. Never call from prod paths.
 */
export async function clearAllStagedRetreats(): Promise<{ deleted: number }> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("retreat_imports")
    .delete()
    .not("id", "is", null)
    .select("id");
  if (error) throw new Error(`clear staging: ${error.message}`);
  revalidatePath("/admin/retreat-imports");
  return { deleted: data?.length ?? 0 };
}

export type BatchExtractResult = {
  attempted: number;
  succeeded: number;
  failed: number;
  total_warnings: number;
  per_retreat: {
    url_inventory_id: string;
    title: string | null;
    url: string;
    ok: boolean;
    error?: string;
    warning_count: number;
    image_summary?: ExtractOutcome["image_summary"];
  }[];
};

/**
 * Extract a batch of retreats into staging in one go. Picks the N
 * most-recently-modified retreats that haven't been staged yet (or
 * picks an explicit list of url_inventory_ids if provided). Runs in
 * series — extract is I/O-heavy (image fetches) and parallelism would
 * hammer the WP origin.
 */
export async function batchExtractRetreats(opts: {
  limit?: number;
  url_inventory_ids?: string[];
  include_already_staged?: boolean;
}): Promise<BatchExtractResult> {
  const sb = supabaseServer();

  let ids: string[] = [];
  if (opts.url_inventory_ids && opts.url_inventory_ids.length > 0) {
    ids = opts.url_inventory_ids;
  } else {
    const limit = Math.min(50, Math.max(1, opts.limit ?? 10));
    const { data: candidates } = await sb
      .from("url_inventory")
      .select("id, date_modified")
      .eq("source_site", "v1")
      .eq("post_type", "retreat")
      .neq("url", "https://anamaya.com/retreats/")
      .order("date_modified", { ascending: false })
      .limit(200);

    let candidateIds = (candidates ?? []).map((r) => r.id);
    if (!opts.include_already_staged) {
      const { data: staged } = await sb
        .from("retreat_imports")
        .select("url_inventory_id")
        .in("url_inventory_id", candidateIds);
      const stagedSet = new Set((staged ?? []).map((s) => s.url_inventory_id));
      candidateIds = candidateIds.filter((id) => !stagedSet.has(id));
    }
    ids = candidateIds.slice(0, limit);
  }

  const titlesById = new Map<string, { title: string | null; url: string }>();
  if (ids.length > 0) {
    const { data: rows } = await sb
      .from("url_inventory")
      .select("id, title, url")
      .in("id", ids);
    for (const r of rows ?? []) titlesById.set(r.id, { title: r.title, url: r.url });
  }

  const per_retreat: BatchExtractResult["per_retreat"] = [];
  let succeeded = 0;
  let failed = 0;
  let total_warnings = 0;

  for (const id of ids) {
    const meta = titlesById.get(id) ?? { title: null, url: "" };
    try {
      const out = await extractRetreatToStaging(id);
      succeeded++;
      total_warnings += out.warnings.length;
      per_retreat.push({
        url_inventory_id: id,
        title: meta.title,
        url: meta.url,
        ok: true,
        warning_count: out.warnings.length,
        image_summary: out.image_summary,
      });
    } catch (e) {
      failed++;
      per_retreat.push({
        url_inventory_id: id,
        title: meta.title,
        url: meta.url,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        warning_count: 0,
      });
    }
  }

  revalidatePath("/admin/retreat-imports");
  return { attempted: ids.length, succeeded, failed, total_warnings, per_retreat };
}
