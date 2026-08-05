import "server-only";
import { cache } from "react";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import { generateFaqDraft, FAQ_MODEL_REF, type FaqDraft } from "@/lib/ai/faq-generator";

/**
 * Per-page FAQ storage access. The public block reads APPROVED FAQs only
 * (see getPublicFaqs) so crawlers always get reviewed, pre-generated text
 * baked into the server HTML. Drafting/editing/approval is admin-side.
 */

export type PageFaq = {
  id: string;
  question: string;
  answer: string;
  is_featured: boolean;
  sort_order: number;
  source: "ai" | "edited" | "manual";
};

export type PageFaqMeta = {
  approved: boolean;
  last_prompt: string | null;
  model: string | null;
  generated_at: string | null;
};

/**
 * FAQs shown to the public for a page — only when the page is approved.
 * Cached per request (the block may render more than once per page). Split
 * into featured (always visible) and the rest (collapsible), each ordered.
 */
export const getPublicFaqs = cache(
  async (pageId: string): Promise<{ featured: PageFaq[]; more: PageFaq[] }> => {
    const empty = { featured: [], more: [] };
    const sb = supabaseServerOrNull();
    if (!sb || !pageId) return empty;

    const { data: meta } = await sb
      .from("page_faq_meta")
      .select("approved")
      .eq("url_inventory_id", pageId)
      .maybeSingle();
    if (!meta?.approved) return empty;

    const { data } = await sb
      .from("page_faqs")
      .select("id, question, answer, is_featured, sort_order, source")
      .eq("url_inventory_id", pageId)
      .order("sort_order", { ascending: true });
    const rows = (data ?? []) as PageFaq[];
    return {
      featured: rows.filter((r) => r.is_featured),
      more: rows.filter((r) => !r.is_featured),
    };
  },
);

/** All FAQs + meta for a page, regardless of approval — for the admin editor. */
export async function getAdminFaqs(
  pageId: string,
): Promise<{ faqs: PageFaq[]; meta: PageFaqMeta | null }> {
  const sb = supabaseServerOrNull();
  if (!sb || !pageId) return { faqs: [], meta: null };
  const [{ data: faqs }, { data: meta }] = await Promise.all([
    sb
      .from("page_faqs")
      .select("id, question, answer, is_featured, sort_order, source")
      .eq("url_inventory_id", pageId)
      .order("sort_order", { ascending: true }),
    sb
      .from("page_faq_meta")
      .select("approved, last_prompt, model, generated_at")
      .eq("url_inventory_id", pageId)
      .maybeSingle(),
  ]);
  return { faqs: (faqs ?? []) as PageFaq[], meta: (meta ?? null) as PageFaqMeta | null };
}

/**
 * Replace a page's FAQ list wholesale (used by generate/regenerate and by a
 * full save from the editor). Leaves the approval flag as-is unless
 * `approve` is passed. Marks provenance per row.
 */
export async function replacePageFaqs(
  pageId: string,
  faqs: { question: string; answer: string; is_featured: boolean; source?: PageFaq["source"] }[],
  meta?: { last_prompt?: string | null; model?: string | null; approve?: boolean },
): Promise<void> {
  const sb = supabaseServerOrNull();
  if (!sb || !pageId) throw new Error("No DB connection");

  await sb.from("page_faqs").delete().eq("url_inventory_id", pageId);
  if (faqs.length) {
    const rows = faqs.map((f, i) => ({
      url_inventory_id: pageId,
      question: f.question,
      answer: f.answer,
      is_featured: f.is_featured,
      sort_order: i,
      source: f.source ?? "ai",
    }));
    const { error } = await sb.from("page_faqs").insert(rows);
    if (error) throw new Error(error.message);
  }

  const metaRow: Record<string, unknown> = {
    url_inventory_id: pageId,
    updated_at: new Date().toISOString(),
  };
  if (meta?.last_prompt !== undefined) metaRow.last_prompt = meta.last_prompt;
  if (meta?.model !== undefined) metaRow.model = meta.model;
  if (meta?.approve !== undefined) metaRow.approved = meta.approve;
  metaRow.generated_at = new Date().toISOString();
  const { error: mErr } = await sb
    .from("page_faq_meta")
    .upsert(metaRow, { onConflict: "url_inventory_id" });
  if (mErr) throw new Error(mErr.message);
}

/** Toggle a page's public visibility (the review gate). */
export async function setPageFaqApproved(pageId: string, approved: boolean): Promise<void> {
  const sb = supabaseServerOrNull();
  if (!sb || !pageId) throw new Error("No DB connection");
  const { error } = await sb
    .from("page_faq_meta")
    .upsert(
      { url_inventory_id: pageId, approved, updated_at: new Date().toISOString() },
      { onConflict: "url_inventory_id" },
    );
  if (error) throw new Error(error.message);
}

/**
 * Draft FAQs for a page with the AI and store them (as an unapproved draft
 * unless `approve` is set). Returns the drafts. Used by the editor's
 * generate/regenerate action and by bulk generation.
 */
export async function generateAndSaveFaqs(
  pageId: string,
  opts?: { extraPrompt?: string; approve?: boolean },
): Promise<FaqDraft[]> {
  const drafts = await generateFaqDraft(pageId, { extraPrompt: opts?.extraPrompt });
  await replacePageFaqs(
    pageId,
    drafts.map((d) => ({ ...d, source: "ai" as const })),
    { last_prompt: opts?.extraPrompt ?? null, model: FAQ_MODEL_REF, approve: opts?.approve },
  );
  return drafts;
}
