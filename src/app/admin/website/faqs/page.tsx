import { getFaqKnowledge } from "@/lib/website-builder/settings";
import { getAOAIContext } from "@/lib/ao-ai-context";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import { decodeEntities } from "@/lib/website-builder/decode";
import PageHeader from "../_components/PageHeader";
import type { FaqSet } from "./builder-actions";
import FaqBuilder, { type ArticleOption, type AvatarOption } from "./FaqBuilder";

/**
 * FAQ builder. Two panels: pick information sources on the left (AnamayOS brand
 * voice + avatars, your notes, website articles), generate + edit on the right.
 * The notes persist to the "faq_knowledge" settings row; AnamayOS data is read
 * live. Everything selected feeds the same generator the per-article panel uses.
 */

const ARTICLE_POST_TYPES = [
  "page",
  "post",
  "retreat",
  "ytt",
  "accommodations",
  "cp_recipe",
];

async function loadArticles(): Promise<ArticleOption[]> {
  const sb = supabaseServerOrNull();
  if (!sb) return [];
  const { data } = await sb
    .from("url_inventory")
    .select("id, title, post_type")
    .eq("url_kind", "content")
    .eq("source_site", "v2")
    .not("title", "is", null)
    .in("post_type", ARTICLE_POST_TYPES)
    .order("post_type")
    .limit(1000);
  return (data ?? [])
    .filter((r) => r.title)
    .map((r) => ({
      id: r.id as string,
      title: decodeEntities(String(r.title)),
      postType: String(r.post_type),
    }));
}

async function loadFaqSets(): Promise<FaqSet[]> {
  const sb = supabaseServerOrNull();
  if (!sb) return [];
  const { data } = await sb
    .from("faq_sets")
    .select("id, code, name, items")
    .order("created_at", { ascending: false });
  return (data ?? []) as FaqSet[];
}

export default async function FaqBuilderPage() {
  const [notes, ao, articles, sets] = await Promise.all([
    getFaqKnowledge(),
    getAOAIContext(),
    loadArticles(),
    loadFaqSets(),
  ]);

  const avatars: AvatarOption[] = (ao.archetypes ?? [])
    .filter((a) => a.is_active !== false)
    .map((a) => ({ id: a.id, name: a.name, description: a.description }));

  return (
    <div className="px-5 py-4">
      <PageHeader title="FAQs" />

      <p className="mb-4 max-w-3xl text-[13px] leading-relaxed text-[#50575e]">
        Build FAQ sets here. On the left, tick the information the AI should use
        — your AnamayOS brand voice and customer avatars, your own notes, and any
        website articles. On the right, give it a prompt, generate, and edit the
        result. Your notes are saved for reuse; nothing here is shown to visitors
        until FAQs are published on a page.
      </p>

      <FaqBuilder
        initialNotes={notes}
        aoBrandName={ao.guides[0]?.name ?? null}
        avatars={avatars}
        articles={articles}
        initialSets={sets}
      />
    </div>
  );
}
