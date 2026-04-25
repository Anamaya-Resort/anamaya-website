import "server-only";
import { supabaseServerOrNull } from "@/lib/supabase-server";
import { POST_TYPES } from "./post-types";
import { decodeEntities } from "./decode";

/** Which WP source we surface in the Website Builder. v2 = staging (newest). */
const SOURCE_SITE = "v2";

const PUBLISHED_STATUSES = ["publish", "private"];
const NON_TRASH_STATUSES = ["publish", "private", "draft", "pending", "future"];

export type ListRow = {
  id: string;
  title: string;
  url_path: string;
  wp_status: string | null;
  date_published: string | null;
  date_modified: string | null;
  author: { display_name: string | null; slug: string | null } | null;
  terms: { taxonomy: string; name: string; slug: string }[];
  has_template: boolean;
};

export type ListStatusCounts = {
  all: number;
  publish: number;
  draft: number;
  trash: number;
};

export type ListResult = {
  rows: ListRow[];
  totalCount: number;
  statusCounts: ListStatusCounts;
  page: number;
  perPage: number;
};

export type ListOpts = {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
};

const EMPTY_RESULT: ListResult = {
  rows: [],
  totalCount: 0,
  statusCounts: { all: 0, publish: 0, draft: 0, trash: 0 },
  page: 1,
  perPage: 20,
};

export async function listByPostType(
  postType: string,
  opts: ListOpts = {},
): Promise<ListResult> {
  const sb = supabaseServerOrNull();
  if (!sb) return EMPTY_RESULT;

  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(200, Math.max(1, opts.perPage ?? 20));
  const offset = (page - 1) * perPage;
  const status = opts.status ?? "all";

  let query = sb
    .from("url_inventory")
    .select(
      "id, title, url_path, wp_status, date_published, date_modified, cms_template_id, author_id",
      { count: "exact" },
    )
    .eq("source_site", SOURCE_SITE)
    .eq("post_type", postType)
    .eq("url_kind", "content");

  if (status === "trash") {
    query = query.eq("wp_status", "trash");
  } else if (status === "publish") {
    query = query.in("wp_status", PUBLISHED_STATUSES);
  } else if (status === "draft") {
    query = query.eq("wp_status", "draft");
  } else {
    // "all" excludes trash, mirrors WP behavior
    query = query.in("wp_status", NON_TRASH_STATUSES);
  }

  if (opts.search) {
    query = query.ilike("title", `%${opts.search}%`);
  }

  query = query
    .order("date_published", { ascending: false, nullsFirst: false })
    .range(offset, offset + perPage - 1);

  const { data, count, error } = await query;
  if (error || !data) return { ...EMPTY_RESULT, page, perPage };

  const authorIds = [
    ...new Set(
      data.map((r) => r.author_id).filter((x): x is string => Boolean(x)),
    ),
  ];
  const authorMap = new Map<string, { display_name: string; slug: string }>();
  if (authorIds.length) {
    const { data: authors } = await sb
      .from("authors")
      .select("id, display_name, slug")
      .in("id", authorIds);
    for (const a of authors ?? []) {
      authorMap.set(a.id, { display_name: a.display_name, slug: a.slug });
    }
  }

  const ids = data.map((r) => r.id);
  const termsByPost = new Map<
    string,
    { taxonomy: string; name: string; slug: string }[]
  >();
  if (ids.length) {
    const { data: pt } = await sb
      .from("post_terms")
      .select("url_inventory_id, taxonomy_terms(taxonomy, name, slug)")
      .in("url_inventory_id", ids);
    type PtRow = {
      url_inventory_id: string;
      taxonomy_terms:
        | { taxonomy: string; name: string; slug: string }
        | { taxonomy: string; name: string; slug: string }[]
        | null;
    };
    for (const row of (pt ?? []) as unknown as PtRow[]) {
      const tt = row.taxonomy_terms;
      if (!tt) continue;
      const list = Array.isArray(tt) ? tt : [tt];
      const arr = termsByPost.get(row.url_inventory_id) ?? [];
      for (const t of list) {
        arr.push({ taxonomy: t.taxonomy, name: t.name, slug: t.slug });
      }
      termsByPost.set(row.url_inventory_id, arr);
    }
  }

  const statusCounts = await getStatusCountsForType(postType, opts.search);

  const rows: ListRow[] = data.map((r) => ({
    id: r.id,
    title: decodeEntities(r.title ?? "(no title)"),
    url_path: r.url_path,
    wp_status: r.wp_status,
    date_published: r.date_published,
    date_modified: r.date_modified,
    author: r.author_id ? authorMap.get(r.author_id) ?? null : null,
    terms: termsByPost.get(r.id) ?? [],
    has_template: !!r.cms_template_id,
  }));

  return {
    rows,
    totalCount: count ?? 0,
    statusCounts,
    page,
    perPage,
  };
}

async function getStatusCountsForType(
  postType: string,
  search?: string,
): Promise<ListStatusCounts> {
  const sb = supabaseServerOrNull();
  if (!sb) return { all: 0, publish: 0, draft: 0, trash: 0 };

  let query = sb
    .from("url_inventory")
    .select("wp_status")
    .eq("source_site", SOURCE_SITE)
    .eq("post_type", postType)
    .eq("url_kind", "content");
  if (search) query = query.ilike("title", `%${search}%`);

  const { data } = await query;
  const counts: ListStatusCounts = { all: 0, publish: 0, draft: 0, trash: 0 };
  for (const r of data ?? []) {
    const s = r.wp_status ?? "publish";
    if (s === "trash") counts.trash++;
    else {
      counts.all++;
      if (s === "publish" || s === "private") counts.publish++;
      else if (s === "draft") counts.draft++;
    }
  }
  return counts;
}

/** Counts per post type for the Dashboard "At a Glance" widget. */
export async function getDashboardCounts(): Promise<Record<string, number>> {
  const sb = supabaseServerOrNull();
  if (!sb) return {};
  const counts: Record<string, number> = {};
  await Promise.all(
    POST_TYPES.map(async (pt) => {
      const { count } = await sb
        .from("url_inventory")
        .select("id", { count: "exact", head: true })
        .eq("source_site", SOURCE_SITE)
        .eq("post_type", pt.postType)
        .eq("url_kind", "content")
        .in("wp_status", NON_TRASH_STATUSES);
      counts[pt.slug] = count ?? 0;
    }),
  );
  return counts;
}

export type AuthorRow = {
  id: string;
  display_name: string;
  slug: string | null;
  avatar_url: string | null;
  description: string | null;
  post_count: number;
};

export async function listAuthors(): Promise<AuthorRow[]> {
  const sb = supabaseServerOrNull();
  if (!sb) return [];

  const { data: authors } = await sb
    .from("authors")
    .select("id, display_name, slug, avatar_url, description")
    .eq("source_site", SOURCE_SITE)
    .order("display_name", { ascending: true });
  if (!authors) return [];

  // Per-author post count (not a fast bulk operation in PostgREST without a view —
  // but author counts on a small list are cheap)
  const counts = new Map<string, number>();
  await Promise.all(
    authors.map(async (a) => {
      const { count } = await sb
        .from("url_inventory")
        .select("id", { count: "exact", head: true })
        .eq("source_site", SOURCE_SITE)
        .eq("author_id", a.id)
        .in("wp_status", NON_TRASH_STATUSES);
      counts.set(a.id, count ?? 0);
    }),
  );

  return authors.map((a) => ({
    id: a.id,
    display_name: decodeEntities(a.display_name ?? "(unnamed)"),
    slug: a.slug,
    avatar_url: a.avatar_url,
    description: a.description,
    post_count: counts.get(a.id) ?? 0,
  }));
}

export type TaxonomyTermRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  post_count: number;
};

export async function listTaxonomyTerms(
  taxonomy: string,
): Promise<TaxonomyTermRow[]> {
  const sb = supabaseServerOrNull();
  if (!sb) return [];

  const { data: terms } = await sb
    .from("taxonomy_terms")
    .select("id, name, slug, description, post_count")
    .eq("source_site", SOURCE_SITE)
    .eq("taxonomy", taxonomy)
    .order("name", { ascending: true });
  if (!terms) return [];

  return terms.map((t) => ({
    id: t.id,
    name: decodeEntities(t.name ?? ""),
    slug: t.slug,
    description: t.description,
    // Prefer the WP-supplied count; fall back to 0
    post_count: t.post_count ?? 0,
  }));
}

export type MediaRow = {
  id: string;
  title: string | null;
  alt_text: string | null;
  mime_type: string | null;
  storage_url: string | null;
  source_url: string | null;
  width: number | null;
  height: number | null;
  created_at: string | null;
};

export type MediaResult = {
  rows: MediaRow[];
  totalCount: number;
  page: number;
  perPage: number;
};

export type EditorItem = {
  id: string;
  title: string | null;
  url_path: string;
  wp_status: string | null;
  date_published: string | null;
  date_modified: string | null;
  excerpt: string | null;
  cms_template_id: string | null;
  cms_body_html: string | null;
  content_rendered: string | null;
  scraped_body_html: string | null;
  author: { id: string; display_name: string | null } | null;
  // SEO overrides — null falls back to title / site_settings.default_meta.
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  noindex: boolean;
  // AI provenance — populated by the future AI rewrite phase.
  ai_last_model: string | null;
  ai_last_edit_at: string | null;
  ai_last_kind: string | null;
};

export async function getItemForEdit(
  postType: string,
  id: string,
): Promise<EditorItem | null> {
  const sb = supabaseServerOrNull();
  if (!sb) return null;

  const { data: row, error } = await sb
    .from("url_inventory")
    .select(
      "id, title, url_path, wp_status, date_published, date_modified, excerpt, cms_template_id, scraped_body_html, author_id, meta_title, meta_description, canonical_url, og_image_url, noindex",
    )
    .eq("id", id)
    .eq("source_site", SOURCE_SITE)
    .eq("post_type", postType)
    .maybeSingle();
  if (error || !row) return null;

  const { data: content } = await sb
    .from("content_items")
    .select("content_rendered, cms_body_html, ai_last_model, ai_last_edit_at, ai_last_kind")
    .eq("url_inventory_id", id)
    .maybeSingle();

  let author: EditorItem["author"] = null;
  if (row.author_id) {
    const { data: a } = await sb
      .from("authors")
      .select("id, display_name")
      .eq("id", row.author_id)
      .maybeSingle();
    if (a) author = { id: a.id, display_name: a.display_name };
  }

  return {
    id: row.id,
    title: row.title ? decodeEntities(row.title) : null,
    url_path: row.url_path,
    wp_status: row.wp_status,
    date_published: row.date_published,
    date_modified: row.date_modified,
    excerpt: row.excerpt ? decodeEntities(row.excerpt) : null,
    cms_template_id: row.cms_template_id,
    cms_body_html: content?.cms_body_html ?? null,
    content_rendered: content?.content_rendered ?? null,
    scraped_body_html: row.scraped_body_html ?? null,
    author,
    meta_title: row.meta_title ?? null,
    meta_description: row.meta_description ?? null,
    canonical_url: row.canonical_url ?? null,
    og_image_url: row.og_image_url ?? null,
    noindex: !!row.noindex,
    ai_last_model: content?.ai_last_model ?? null,
    ai_last_edit_at: content?.ai_last_edit_at ?? null,
    ai_last_kind: content?.ai_last_kind ?? null,
  };
}

export type PageTemplateRow = { id: string; slug: string; name: string };

export async function listPageTemplates(): Promise<PageTemplateRow[]> {
  const sb = supabaseServerOrNull();
  if (!sb) return [];
  const { data } = await sb
    .from("page_templates")
    .select("id, slug, name")
    .order("name", { ascending: true });
  return (data ?? []).map((t) => ({ id: t.id, slug: t.slug, name: t.name }));
}

export async function listMedia(
  opts: { page?: number; perPage?: number } = {},
): Promise<MediaResult> {
  const sb = supabaseServerOrNull();
  if (!sb) return { rows: [], totalCount: 0, page: 1, perPage: 24 };

  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(96, Math.max(1, opts.perPage ?? 24));
  const offset = (page - 1) * perPage;

  const { data, count } = await sb
    .from("media_items")
    .select(
      "id, title, alt_text, mime_type, storage_url, source_url, width, height, created_at",
      { count: "exact" },
    )
    .eq("source_site", SOURCE_SITE)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  return {
    rows: (data ?? []).map((m) => ({
      id: m.id,
      title: m.title ? decodeEntities(m.title) : null,
      alt_text: m.alt_text,
      mime_type: m.mime_type,
      storage_url: m.storage_url,
      source_url: m.source_url,
      width: m.width,
      height: m.height,
      created_at: m.created_at,
    })),
    totalCount: count ?? 0,
    page,
    perPage,
  };
}
