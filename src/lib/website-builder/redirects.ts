import "server-only";
import { supabaseServerOrNull } from "@/lib/supabase-server";

/**
 * Canonical form for redirect source paths and inbound request paths.
 * Stored values and lookup keys must use the same canonicalization or
 * the catch-all router will miss matches that the admin UI saved.
 */
export function canonicalizeSourcePath(raw: string): string {
  let s = (raw ?? "").trim();
  if (!s) return "/";
  if (!s.startsWith("/")) s = "/" + s;
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

export type RedirectRow = {
  id: string;
  source_path: string;
  target: string;
  status_code: 301 | 302 | 307 | 308;
  hits: number;
  last_hit_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RedirectListResult = {
  rows: RedirectRow[];
  totalCount: number;
  page: number;
  perPage: number;
};

export async function listRedirects(
  opts: { page?: number; perPage?: number; search?: string } = {},
): Promise<RedirectListResult> {
  const sb = supabaseServerOrNull();
  if (!sb) return { rows: [], totalCount: 0, page: 1, perPage: 50 };

  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(200, Math.max(1, opts.perPage ?? 50));
  const offset = (page - 1) * perPage;

  let query = sb
    .from("redirects")
    .select(
      "id, source_path, target, status_code, hits, last_hit_at, notes, created_at, updated_at",
      { count: "exact" },
    );
  if (opts.search) {
    // PostgREST .or() parses the string as filter syntax — any unescaped
    // comma, paren, or dot inside a value would break out and let the
    // caller construct arbitrary filters. Wrap each value in double
    // quotes and double any literal " inside.
    const safe = opts.search.replace(/"/g, '""');
    query = query.or(
      `source_path.ilike."%${safe}%",target.ilike."%${safe}%"`,
    );
  }
  query = query
    .order("source_path", { ascending: true })
    .range(offset, offset + perPage - 1);

  const { data, count } = await query;
  return {
    rows: (data ?? []) as RedirectRow[],
    totalCount: count ?? 0,
    page,
    perPage,
  };
}

/**
 * Look up a redirect by source path. Returns null on miss.
 * Canonicalizes the input so callers can pass raw request pathnames.
 */
export async function findRedirect(
  sourcePath: string,
): Promise<RedirectRow | null> {
  const sb = supabaseServerOrNull();
  if (!sb) return null;
  const canonical = canonicalizeSourcePath(sourcePath);
  const { data } = await sb
    .from("redirects")
    .select(
      "id, source_path, target, status_code, hits, last_hit_at, notes, created_at, updated_at",
    )
    .eq("source_path", canonical)
    .maybeSingle();
  return (data ?? null) as RedirectRow | null;
}
