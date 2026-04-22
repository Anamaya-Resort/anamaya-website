import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_BRANDING,
  mergeBranding,
  type OrgBranding,
} from "@/config/brand-tokens";

/**
 * Reads the site's brand tokens from AnamayaOS's `org_branding` table and
 * merges with DEFAULT_BRANDING. AO is a different Supabase project than
 * the website, so we use a dedicated anon-key client.
 *
 * `cache()` dedupes calls within a single server render (per Next 16 request
 * scope). If AO is unreachable or env vars are missing we silently fall back
 * to DEFAULT_BRANDING so the site stays up.
 */
export const getBrandTokens = cache(async (): Promise<Required<OrgBranding>> => {
  const url = process.env.AO_SUPABASE_URL;
  const anon = process.env.AO_SUPABASE_ANON_KEY;
  if (!url || !anon) return DEFAULT_BRANDING;

  try {
    const sb = createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await sb
      .from("org_branding")
      .select("branding")
      .eq("org_slug", "default")
      .maybeSingle();
    if (error || !data?.branding) return DEFAULT_BRANDING;
    return mergeBranding(DEFAULT_BRANDING, data.branding as Partial<OrgBranding>);
  } catch {
    return DEFAULT_BRANDING;
  }
});
