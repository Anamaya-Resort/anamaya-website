"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import { type FaqKnowledgeSettings } from "@/lib/website-builder/settings";
import { getAOAIContext } from "@/lib/ao-ai-context";
import { buildPageContext } from "@/lib/ai/retreat-recommender";
import { replacePageFaqs } from "@/lib/website-builder/faqs";
import {
  draftFaqsFromContent,
  formatAoBrand,
  formatAoAvatars,
  cap,
  type FaqDraft,
} from "@/lib/ai/faq-generator";

/**
 * Server actions for the two-panel FAQ builder. Generation assembles a prompt
 * from ONLY the sources the user ticked on the left, so the output reflects
 * exactly what they selected.
 */

export type BuilderSources = {
  prompt?: string;
  includeAoBrand?: boolean;
  avatarIds?: string[];
  manual?: {
    customer_avatars?: boolean;
    brand_vibe?: boolean;
    info?: boolean;
    faq_content?: boolean;
  };
  /** The CURRENT (possibly unsaved) note text from the editor — used so a run
   *  reflects what's on screen, not the last saved copy. */
  manualNotes?: FaqKnowledgeSettings;
  articleIds?: string[];
};

export type BuilderResult =
  | { ok: true; faqs: FaqDraft[] }
  | { ok: false; error: string };

export async function generateFaqSetAction(
  src: BuilderSources,
): Promise<BuilderResult> {
  try {
    const ao = await getAOAIContext();
    const notes = src.manualNotes;
    const nv = (s: string | undefined) => (s ?? "").trim();

    const parts: string[] = [];
    if (src.includeAoBrand) {
      const b = formatAoBrand(ao.guides[0]);
      if (b) parts.push(`BRAND VOICE (from AnamayOS):\n${b}`);
    }
    if (src.avatarIds?.length) {
      const chosen = (ao.archetypes ?? []).filter((a) =>
        src.avatarIds!.includes(a.id),
      );
      const av = formatAoAvatars(chosen);
      if (av) parts.push(`CUSTOMER AVATARS (from AnamayOS):\n${cap(av, 4000)}`);
    }
    // Manual notes use the CURRENT editor text (src.manualNotes), so unsaved
    // edits are honoured; only ticked, non-empty fields are included.
    if (src.manual?.brand_vibe && nv(notes?.brand_vibe))
      parts.push(`BRAND & VIBE:\n${cap(nv(notes?.brand_vibe), 3000)}`);
    if (src.manual?.customer_avatars && nv(notes?.customer_avatars))
      parts.push(
        `CUSTOMER AVATARS (notes):\n${cap(nv(notes?.customer_avatars), 3000)}`,
      );
    if (src.manual?.info && nv(notes?.info))
      parts.push(`REFERENCE INFO (authoritative):\n${cap(nv(notes?.info), 6000)}`);
    if (src.manual?.faq_content && nv(notes?.faq_content))
      parts.push(`EXISTING FAQ LIBRARY:\n${cap(nv(notes?.faq_content), 6000)}`);
    const referenceText = parts.join("\n\n");

    let contentText = "";
    if (src.articleIds?.length) {
      // Cap the number of articles so one run can't blow the context/budget.
      const chunks = await Promise.all(
        src.articleIds.slice(0, 10).map((id) => buildPageContext(id)),
      );
      contentText = cap(chunks.filter(Boolean).join("\n\n---\n\n"), 12000);
    }

    // Require a grounded source, not a prompt alone: with no reference or
    // content the model would fabricate facts (prices, policies, dates).
    if (!referenceText && !contentText) {
      return {
        ok: false,
        error:
          "Pick at least one info source on the left (brand, avatars, notes, or an article) so the answers are grounded — a prompt on its own can invent facts.",
      };
    }

    const faqs = await draftFaqsFromContent({
      referenceText,
      contentText,
      extraPrompt: src.prompt,
    });
    if (!faqs.length) {
      return {
        ok: false,
        error:
          "The AI returned no FAQs. Try adding more sources or a clearer prompt.",
      };
    }
    return { ok: true, faqs };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Something went wrong",
    };
  }
}

export type FaqSetItem = {
  question: string;
  answer: string;
  is_featured: boolean;
};
export type FaqSet = {
  id: string;
  code: string;
  name: string;
  items: FaqSetItem[];
};

function cleanItems(items: FaqSetItem[]): FaqSetItem[] {
  return (items ?? [])
    .map((i) => ({
      question: (i.question ?? "").trim(),
      answer: (i.answer ?? "").trim(),
      is_featured: !!i.is_featured,
    }))
    .filter((i) => i.question && i.answer);
}

/** Save the current output as a reusable FAQ set. New sets get the next
 *  "FAQ-#" code; passing an id updates that set in place. */
export async function saveFaqSetAction(args: {
  id?: string;
  name: string;
  items: FaqSetItem[];
}): Promise<{ ok: true; set: FaqSet } | { ok: false; error: string }> {
  const sb = supabaseServerOrNull();
  if (!sb) return { ok: false, error: "No database connection" };
  const items = cleanItems(args.items);
  if (!items.length) {
    return {
      ok: false,
      error: "Add at least one complete question and answer before saving.",
    };
  }
  const name = (args.name ?? "").trim();

  if (args.id) {
    const { data, error } = await sb
      .from("faq_sets")
      .update({ name, items, updated_at: new Date().toISOString() })
      .eq("id", args.id)
      .select("id, code, name, items")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/website/faqs");
    return { ok: true, set: data as FaqSet };
  }

  // Next "FAQ-#" code = max existing + 1. Retry on the unique-code collision
  // (two first-time saves racing) rather than surface a raw Postgres error.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await sb.from("faq_sets").select("code");
    let max = 0;
    for (const r of existing ?? []) {
      const m = /^FAQ-(\d+)$/.exec((r.code as string) ?? "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    const code = `FAQ-${max + 1}`;
    const { data, error } = await sb
      .from("faq_sets")
      .insert({ code, name, items })
      .select("id, code, name, items")
      .single();
    if (!error) {
      revalidatePath("/admin/website/faqs");
      return { ok: true, set: data as FaqSet };
    }
    if (!/duplicate key|unique/i.test(error.message)) {
      return { ok: false, error: error.message };
    }
  }
  return { ok: false, error: "Could not allocate a FAQ code. Please try again." };
}

/**
 * Does this page actually render FAQs? Only if its template includes a block of
 * type_slug 'faq'. A page with no template (cms_template_id null) or a template
 * without the FAQ block will store page_faqs but show nothing and emit no
 * schema — so the caller can warn instead of falsely claiming "published".
 */
async function pageRendersFaqBlock(
  sb: NonNullable<ReturnType<typeof supabaseServerOrNull>>,
  pageId: string,
): Promise<boolean> {
  const { data: inv } = await sb
    .from("url_inventory")
    .select("cms_template_id")
    .eq("id", pageId)
    .maybeSingle();
  const templateId = inv?.cms_template_id;
  if (!templateId) return false;
  const { data: variant } = await sb
    .from("page_template_variants")
    .select("id")
    .eq("page_template_id", templateId)
    .eq("is_default", true)
    .maybeSingle();
  if (!variant) return false;
  const { data: vbs } = await sb
    .from("page_template_variant_blocks")
    .select("block:blocks(type_slug)")
    .eq("page_template_variant_id", variant.id);
  // block is a to-one FK, returned as an object at runtime; the generated
  // types infer an array, so cast through unknown (as TemplateRenderer does).
  const rows = (vbs ?? []) as unknown as {
    block: { type_slug: string } | null;
  }[];
  return rows.some((r) => r.block?.type_slug === "faq");
}

/**
 * Apply a set (or the current output) to a specific page: copies the items into
 * that page's page_faqs and approves them, so the FAQ block on that page renders
 * them — schema (FAQPage + speakable) follows automatically. Replaces whatever
 * FAQs that page had. Returns a warning when the page has no FAQ block to render
 * them (they're stored but won't show until a FAQ block is added to its template).
 */
export async function applyFaqSetToPageAction(args: {
  pageId: string;
  items: FaqSetItem[];
  publicPath?: string;
}): Promise<{ ok: boolean; error?: string; warning?: string }> {
  if (!args.pageId) return { ok: false, error: "Pick a page to apply to." };
  const items = cleanItems(args.items);
  if (!items.length) return { ok: false, error: "Nothing to apply." };
  const sb = supabaseServerOrNull();
  if (!sb) return { ok: false, error: "No database connection" };
  try {
    await replacePageFaqs(
      args.pageId,
      items.map((i) => ({ ...i, source: "manual" as const })),
      { approve: true },
    );
    revalidatePath("/admin/website");
    if (args.publicPath) revalidatePath(args.publicPath);
    const renders = await pageRendersFaqBlock(sb, args.pageId);
    return renders
      ? { ok: true }
      : {
          ok: true,
          warning:
            "Saved, but this page has no FAQ block on its template yet, so the FAQs (and their schema) won't appear until a FAQ block is added to it.",
        };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to apply" };
  }
}

/** Persist the left-panel free-text notes (the faq_knowledge settings row). */
export async function saveFaqNotesAction(
  notes: FaqKnowledgeSettings,
): Promise<{ ok: boolean; error?: string }> {
  const sb = supabaseServerOrNull();
  if (!sb) return { ok: false, error: "No database connection" };
  const value = {
    customer_avatars: (notes.customer_avatars ?? "").trim(),
    brand_vibe: (notes.brand_vibe ?? "").trim(),
    info: (notes.info ?? "").trim(),
    faq_content: (notes.faq_content ?? "").trim(),
  };
  const { error } = await sb
    .from("site_settings")
    .upsert(
      { key: "faq_knowledge", value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/website/faqs");
  return { ok: true };
}
