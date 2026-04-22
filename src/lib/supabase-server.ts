// Server-side Supabase client using the service_role key.
// Only import from server components and server actions — NEVER from client code.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Returns the Supabase client or `null` if env vars are missing.
 * Callers should short-circuit on null so pages don't crash when deployed
 * to an environment without the service_role key.
 */
export function supabaseServerOrNull(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

/**
 * Throws if env vars are missing. Use when the caller NEEDS supabase
 * (e.g. server actions that must succeed).
 */
export function supabaseServer(): SupabaseClient {
  const client = supabaseServerOrNull();
  if (!client) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return client;
}
