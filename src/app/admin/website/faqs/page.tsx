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
    .select("id, title, post_type, url_path")
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
      urlPath: (r.url_path as string | null) ?? null,
    }));
}

async function loadFaqSets(): Promise<FaqSet[]> {
  const sb = supabaseServerOrNull();
  if (!sb) return [];
  const { data } = await sb
    .from("faq_sets")
    .select("id, code, name, items")
    .order("created_at", { ascending: false });
  // items is freeform jsonb, coerce defensively so a malformed row can't crash
  // the editor with undefined question/answer.
  return (data ?? []).map((r) => {
    const rawItems = Array.isArray(r.items) ? (r.items as unknown[]) : [];
    return {
      id: r.id as string,
      code: r.code as string,
      name: (r.name as string) ?? "",
      items: rawItems
        .map((i) => {
          const o = (i ?? {}) as Record<string, unknown>;
          return {
            question: String(o.question ?? ""),
            answer: String(o.answer ?? ""),
            is_featured: !!o.is_featured,
          };
        })
        .filter((i) => i.question && i.answer),
    };
  });
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
        Make FAQs for a specific article. On the right, choose the article and
        generate. It uses that article&rsquo;s own content plus the reference
        you tick on the left (brand voice, one or two customer avatars, your
        notes). Edit the result, then apply it straight to that article. Nothing
        shows to visitors until it&rsquo;s applied and the page has an FAQ block.
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
