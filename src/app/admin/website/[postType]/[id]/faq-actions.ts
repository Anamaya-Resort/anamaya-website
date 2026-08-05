"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import {
  getAdminFaqs,
  replacePageFaqs,
  setPageFaqApproved,
  generateAndSaveFaqs,
  type PageFaq,
  type PageFaqMeta,
} from "@/lib/website-builder/faqs";

/**
 * Server actions for the per-article FAQ panel. These run in the auth-gated
 * admin area (same trust model as the sibling updateItem action) and use the
 * service-role client inside the faqs.ts helpers.
 *
 * Every action returns a result object instead of throwing, so the client can
 * show a friendly message (e.g. "not enough page content to draft from")
 * rather than an error overlay. `revalidate` refreshes both the admin editor
 * and the public page so approved changes show immediately.
 */

export type FaqActionResult =
  | { ok: true; faqs: PageFaq[]; meta: PageFaqMeta | null }
  | { ok: false; error: string };

type FaqInput = {
  question: string;
  answer: string;
  is_featured: boolean;
  source?: PageFaq["source"];
};

function revalidate(paths: { adminPath?: string; publicPath?: string }) {
  if (paths.adminPath) revalidatePath(paths.adminPath);
  if (paths.publicPath) revalidatePath(paths.publicPath);
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}

/** Draft (or re-draft) this page's FAQs with the AI and store them as an
 *  unapproved draft. Replaces whatever was there. */
export async function generateFaqsAction(args: {
  pageId: string;
  extraPrompt?: string;
  adminPath?: string;
  publicPath?: string;
}): Promise<FaqActionResult> {
  if (!args.pageId) return { ok: false, error: "Missing page id" };
  try {
    await generateAndSaveFaqs(args.pageId, {
      extraPrompt: args.extraPrompt,
      approve: false,
    });
    const { faqs, meta } = await getAdminFaqs(args.pageId);
    revalidate(args);
    return { ok: true, faqs, meta };
  } catch (e) {
    return { ok: false, error: errMessage(e) };
  }
}

/** Persist the editor's current list wholesale. Never changes the approval
 *  flag here EXCEPT that saving an empty list also un-approves, since there is
 *  nothing to show. */
export async function saveFaqsAction(args: {
  pageId: string;
  faqs: FaqInput[];
  adminPath?: string;
  publicPath?: string;
}): Promise<FaqActionResult> {
  if (!args.pageId) return { ok: false, error: "Missing page id" };
  // Drop blank rows (a question with no answer or vice-versa is not useful and
  // would pollute the JSON-LD).
  const clean = (args.faqs ?? [])
    .map((f) => ({
      question: (f.question ?? "").trim(),
      answer: (f.answer ?? "").trim(),
      is_featured: !!f.is_featured,
      source: f.source ?? "manual",
    }))
    .filter((f) => f.question && f.answer);
  try {
    await replacePageFaqs(
      args.pageId,
      clean,
      clean.length === 0 ? { approve: false } : undefined,
    );
    const { faqs, meta } = await getAdminFaqs(args.pageId);
    revalidate(args);
    return { ok: true, faqs, meta };
  } catch (e) {
    return { ok: false, error: errMessage(e) };
  }
}

/** Flip the public visibility gate. Approving requires at least one FAQ. */
export async function setFaqApprovedAction(args: {
  pageId: string;
  approved: boolean;
  adminPath?: string;
  publicPath?: string;
}): Promise<FaqActionResult> {
  if (!args.pageId) return { ok: false, error: "Missing page id" };
  try {
    if (args.approved) {
      const { faqs } = await getAdminFaqs(args.pageId);
      if (faqs.length === 0) {
        return {
          ok: false,
          error: "Add or generate at least one FAQ before approving.",
        };
      }
    }
    await setPageFaqApproved(args.pageId, args.approved);
    const { faqs, meta } = await getAdminFaqs(args.pageId);
    revalidate(args);
    return { ok: true, faqs, meta };
  } catch (e) {
    return { ok: false, error: errMessage(e) };
  }
}
