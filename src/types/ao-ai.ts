// TypeScript types for AnamayOS AI data tables.
// These are read-only from the website — never write back.

export type AOBrandGuide = {
  id: string;
  org_id: string;
  name: string;
  voice_tone: string | null;
  messaging_points: string[] | null;
  usps: string[] | null;
  personality_traits: string[] | null;
  dos_and_donts: { dos: string[]; donts: string[] } | null;
  compiled_context: string | null;
  updated_at: string;
};

export type AOArchetype = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  demographics: Record<string, string> | null;
  motivations: string[] | null;
  pain_points: string[] | null;
  content_tone: string | null;
  sample_messaging: string[] | null;
  sort_order: number;
  is_active: boolean;
};

export type AOContentPrompt = {
  id: string;
  org_id: string;
  name: string;
  category: "article" | "ad_copy" | "video_script" | "ab_test" | "schema" | string;
  system_prompt: string | null;
  user_prompt_template: string | null;
  target_archetype_id: string | null;
  is_active: boolean;
  sort_order: number;
};

export type AOProviderModel = {
  id: string;
  name: string;
  type: "llm" | "image";
  endpoint: string;
  active: boolean;
  added_at: string;
};

export type AOProvider = {
  id: string;
  display_name: string;
  models: AOProviderModel[];
  is_connected: boolean;
  last_tested_at: string | null;
};

export type AOAIContext = {
  guides: AOBrandGuide[];
  archetypes: AOArchetype[];
  prompts: AOContentPrompt[];
  providers: AOProvider[];
  /** The first (or requested) guide's compiled_context, ready to inject as LLM system prompt. */
  systemPrompt: string;
  error: string | null;
};
