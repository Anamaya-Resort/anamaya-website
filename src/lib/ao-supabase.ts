import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Read-only AnamayOS Supabase client (anon key, SELECT-only via RLS).
 * Use only in server components, server actions, and route handlers.
 * Returns null when env vars are missing so callers can degrade gracefully.
 */
export function aoSupabaseOrNull(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.AO_SUPABASE_URL;
  const key = process.env.AO_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

/**
 * Throws if AO env vars are missing. Use when AO data is required for the
 * feature to work; otherwise prefer `aoSupabaseOrNull()` and degrade.
 */
export function aoSupabase(): SupabaseClient {
  const client = aoSupabaseOrNull();
  if (!client) {
    throw new Error(
      "AO_SUPABASE_URL and AO_SUPABASE_ANON_KEY must be set to read AnamayOS data",
    );
  }
  return client;
}
