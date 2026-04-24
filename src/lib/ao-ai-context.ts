import "server-only";
import { cache } from "react";
import { aoSupabaseOrNull } from "./ao-supabase";
import type { AOAIContext, AOBrandGuide, AOArchetype, AOContentPrompt, AOProvider } from "@/types/ao-ai";

const ORG_ID = process.env.AO_ORG_ID ?? "";

/**
 * Fetches all AnamayOS AI data in a single parallel round-trip.
 * Cached per server render (React cache). Degrades gracefully when
 * AO is unreachable — returns empty arrays and an error string.
 */
export const getAOAIContext = cache(async (): Promise<AOAIContext> => {
  const ao = aoSupabaseOrNull();
  if (!ao || !ORG_ID) {
    return {
      guides: [], archetypes: [], prompts: [], providers: [],
      systemPrompt: "",
      error: "AO_SUPABASE_URL, AO_SUPABASE_ANON_KEY, or AO_ORG_ID env vars not set",
    };
  }

  try {
    const [guidesRes, archetypesRes, promptsRes, providersRes] = await Promise.all([
      ao.from("ai_brand_guide")
        .select("id, org_id, name, voice_tone, messaging_points, usps, personality_traits, dos_and_donts, compiled_context, updated_at")
        .eq("org_id", ORG_ID)
        .order("name"),

      ao.from("ai_customer_archetypes")
        .select("*")
        .eq("org_id", ORG_ID)
        .order("sort_order"),

      ao.from("ai_content_prompts")
        .select("*")
        .eq("org_id", ORG_ID)
        .eq("is_active", true)
        .order("sort_order"),

      ao.from("ai_providers")
        .select("id, display_name, models, is_connected, last_tested_at"),
    ]);

    const guides = (guidesRes.data ?? []) as AOBrandGuide[];
    const archetypes = (archetypesRes.data ?? []) as AOArchetype[];
    const prompts = (promptsRes.data ?? []) as AOContentPrompt[];
    const providers = (providersRes.data ?? []) as AOProvider[];

    const errors = [guidesRes.error, archetypesRes.error, promptsRes.error, providersRes.error]
      .filter(Boolean)
      .map((e) => e!.message)
      .join("; ");

    return {
      guides,
      archetypes,
      prompts,
      providers,
      systemPrompt: guides[0]?.compiled_context ?? "",
      error: errors || null,
    };
  } catch (e) {
    return {
      guides: [], archetypes: [], prompts: [], providers: [],
      systemPrompt: "",
      error: e instanceof Error ? e.message : String(e),
    };
  }
});

/**
 * Fill {{variable}} placeholders in a prompt template.
 * Unfilled vars are left as-is so the UI can highlight them.
 */
export function fillPromptTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

/**
 * Assemble the full system + user prompt that would be sent to an LLM,
 * combining a brand guide and optional archetype.
 */
export function assemblePrompt(opts: {
  guide: AOBrandGuide | null;
  archetype: AOArchetype | null;
  promptTemplate: AOContentPrompt | null;
  userText: string;
  templateVars?: Record<string, string>;
}): { system: string; user: string } {
  const parts: string[] = [];
  if (opts.guide?.compiled_context) parts.push(opts.guide.compiled_context);
  if (opts.archetype) {
    parts.push(
      [
        `Target audience: ${opts.archetype.name}`,
        opts.archetype.description ? `Description: ${opts.archetype.description}` : "",
        opts.archetype.content_tone ? `Tone: ${opts.archetype.content_tone}` : "",
        opts.archetype.motivations?.length
          ? `Motivations: ${opts.archetype.motivations.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const system = parts.join("\n\n");

  let user = opts.userText;
  if (opts.promptTemplate?.user_prompt_template) {
    user = fillPromptTemplate(opts.promptTemplate.user_prompt_template, {
      ...opts.templateVars,
      content: opts.userText,
      text: opts.userText,
    });
  }

  return { system, user };
}
