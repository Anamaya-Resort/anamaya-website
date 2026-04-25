import "server-only";
import { cache } from "react";
import { aoSupabaseOrNull } from "@/lib/ao-supabase";
import { getOrganizationContext } from "./organization";

/**
 * Provider/model registry. Reads ai_providers (catalogue, global) and
 * org_ai_provider_config (per-org enablement + role assignments) from
 * AnamayOS, joins them with the website's local env-var presence check,
 * and returns a single list the UI can render directly.
 *
 * Universal rule: active models grouped by provider on top, inactive
 * greyed below a divider. Default selection per `kind` is whichever
 * model the org marked as `role_best_*`.
 */

export type ModelKind =
  | "text"
  | "image_generate"
  | "image_upscale"
  | "image_animate";

export type ModelRole = "best" | "fastest" | "standard";

export type ModelOption = {
  // Stable reference: "{providerId}:{endpoint}" — what callers pass to
  // runChat()/runImage() to identify which model to use.
  ref: string;
  providerId: string;
  providerName: string;
  modelId: string;
  endpoint: string;
  label: string;
  kind: ModelKind;
  role: ModelRole;
  isActive: boolean;
  // Reason the option is inactive (for tooltip). Null when active.
  inactiveReason: string | null;
};

export type AvailableModels = {
  active: ModelOption[];
  inactive: ModelOption[];
  defaultRef: string | null;
};

type AOProviderRow = {
  id: string;
  display_name: string;
  models: AOProviderModel[] | null;
  is_connected: boolean;
};

type AOProviderModel = {
  id: string;
  name: string;
  type: "llm" | "image";
  endpoint: string;
  active: boolean;
};

type AOOrgProviderConfigRow = {
  provider_id: string;
  has_key: boolean;
  is_active: boolean;
  role_best_text: string | null;
  role_fastest_text: string | null;
  role_best_image: string | null;
};

const EMPTY: AvailableModels = {
  active: [],
  inactive: [],
  defaultRef: null,
};

/**
 * Resolves to the merged provider/model list for the active tenant.
 * Memoized per request — Tools 1, 2, 3 in the same render share one fetch.
 */
export const getAvailableModels = cache(
  async (kind: ModelKind): Promise<AvailableModels> => {
    const ao = aoSupabaseOrNull();
    if (!ao) return EMPTY;
    const ctx = await getOrganizationContext();
    if (!ctx) return EMPTY;

    const [providersRes, configsRes] = await Promise.all([
      ao
        .from("ai_providers")
        .select("id, display_name, models, is_connected"),
      ao
        .from("org_ai_provider_config")
        .select(
          "provider_id, has_key, is_active, role_best_text, role_fastest_text, role_best_image",
        )
        .eq("org_id", ctx.org.id),
    ]);

    const providers = (providersRes.data ?? []) as AOProviderRow[];
    const configs = (configsRes.data ?? []) as AOOrgProviderConfigRow[];
    const configByProvider = new Map(configs.map((c) => [c.provider_id, c]));

    const active: ModelOption[] = [];
    const inactive: ModelOption[] = [];

    for (const provider of providers) {
      const cfg = configByProvider.get(provider.id);
      const models = provider.models ?? [];

      for (const m of models) {
        if (!matchesKind(kind, m.type)) continue;

        const role = roleForModel(kind, m.endpoint, cfg);
        const reason = inactiveReason({ provider, cfg, model: m });
        const opt: ModelOption = {
          ref: `${provider.id}:${m.endpoint}`,
          providerId: provider.id,
          providerName: provider.display_name,
          modelId: m.id,
          endpoint: m.endpoint,
          label: m.name,
          kind,
          role,
          isActive: reason === null,
          inactiveReason: reason,
        };
        if (opt.isActive) active.push(opt);
        else inactive.push(opt);
      }
    }

    sortByProviderAndRole(active);
    sortByProviderAndRole(inactive);

    // Default = whichever active model has role=best; falls back to
    // first active option.
    const def =
      active.find((o) => o.role === "best") ?? active[0] ?? null;
    return {
      active,
      inactive,
      defaultRef: def ? def.ref : null,
    };
  },
);

function matchesKind(kind: ModelKind, modelType: "llm" | "image"): boolean {
  if (kind === "text") return modelType === "llm";
  // image_generate, image_upscale, image_animate all map to "image" in AO's
  // current taxonomy. Future schema could add explicit subtypes; until then
  // every image model surfaces under each image kind.
  return modelType === "image";
}

function roleForModel(
  kind: ModelKind,
  endpoint: string,
  cfg: AOOrgProviderConfigRow | undefined,
): ModelRole {
  if (!cfg) return "standard";
  if (kind === "text") {
    if (cfg.role_best_text === endpoint) return "best";
    if (cfg.role_fastest_text === endpoint) return "fastest";
    return "standard";
  }
  // Image kinds — only role_best_image is tracked in AO right now.
  if (cfg.role_best_image === endpoint) return "best";
  return "standard";
}

function inactiveReason({
  provider,
  cfg,
  model,
}: {
  provider: AOProviderRow;
  cfg: AOOrgProviderConfigRow | undefined;
  model: AOProviderModel;
}): string | null {
  if (!model.active) return "Model marked inactive in AnamayOS";
  if (!cfg) return "Provider not configured for this org";
  if (!cfg.is_active) return "Provider disabled for this org";
  if (!cfg.has_key) return "No API key configured";
  if (!websiteHasEnvKey(provider.id))
    return "Website is missing the API key locally";
  if (!provider.is_connected)
    return "AnamayOS reports the provider key as not validated";
  return null;
}

/**
 * The website calls providers directly using its own env-var keys (the
 * AO config table only signals intent). A model can't be "active" if we
 * don't actually have the key here.
 */
function websiteHasEnvKey(providerId: string): boolean {
  switch (providerId) {
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    case "anthropic":
      return !!process.env.ANTHROPIC_API_KEY;
    case "google":
      return !!process.env.GOOGLE_API_KEY;
    case "xai":
      return !!process.env.XAI_API_KEY;
    default:
      return false;
  }
}

function sortByProviderAndRole(list: ModelOption[]): void {
  const ROLE_ORDER: Record<ModelRole, number> = {
    best: 0,
    fastest: 1,
    standard: 2,
  };
  list.sort((a, b) => {
    if (a.providerName !== b.providerName)
      return a.providerName.localeCompare(b.providerName);
    if (a.role !== b.role) return ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
    return a.label.localeCompare(b.label);
  });
}
