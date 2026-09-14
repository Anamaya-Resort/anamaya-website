import "server-only";
import { createHash } from "crypto";
import { supabaseServer, supabaseServerOrNull } from "@/lib/supabase-server";
import { POST_TYPES } from "./post-types";
import { decodeEntities } from "./decode";
import {
  slugify,
  SOURCE_SITE,
  STAGING_BASE,
} from "@/app/admin/website/[postType]/new/create-draft";

// Split testing (A/B) shared reads + the clone-into-variant helper.
//
// Membership lives on url_inventory: split_group_id (which group),
// split_variant_of (the control's id; null = this row IS the control),
// split_label ('Original' / 'Variant A' …), split_weight (traffic share).
// An article belongs to at most one group. See migration 0057.

export type SplitGroupBrief = {
  id: string;
  name: string;
  status: string; // running | paused | ended
  goal: string;
};

export type SplitMemberView = {
  id: string;
  title: string;
  url_path: string;
  wp_status: string | null;
  post_type: string;
  slug: string | null; // admin post-type slug for the edit link
  label: string; // 'Original' / 'Variant A' …
  isControl: boolean;
  hasTemplate: boolean;
};

export type SplitContext = {
  inGroup: boolean;
  group: SplitGroupBrief | null;
  members: SplitMemberView[]; // control first, then variants
  thisIsControl: boolean;
  /** Groups this article could join (only meaningful when inGroup=false). */
  availableGroups: SplitGroupBrief[];
};

/** 'Variant A', 'Variant B', … for the nth (0-based) variant. */
export function variantLabel(n: number): string {
  return `Variant ${String.fromCharCode(65 + n)}`;
}

function slugForType(postType: string): string | null {
  return POST_TYPES.find((p) => p.postType === postType)?.slug ?? null;
}

type MemberRow = {
  id: string;
  title: string | null;
  url_path: string | null;
  wp_status: string | null;
  post_type: string;
  cms_template_id: string | null;
  split_group_id: string | null;
  split_variant_of: string | null;
  split_label: string | null;
  date_published: string | null;
};

const MEMBER_COLS =
  "id,title,url_path,wp_status,post_type,cms_template_id,split_group_id,split_variant_of,split_label,date_published";

function toMemberView(r: MemberRow): SplitMemberView {
  return {
    id: r.id,
    title: decodeEntities(r.title ?? "(no title)"),
    url_path: r.url_path ?? "",
    wp_status: r.wp_status ?? null,
    post_type: r.post_type,
    slug: slugForType(r.post_type),
    label: r.split_label ?? (r.split_variant_of ? "Variant" : "Original"),
    isControl: !r.split_variant_of,
    hasTemplate: !!r.cms_template_id,
  };
}

// Control first, then variants in creation order.
function sortMembers(a: MemberRow, b: MemberRow): number {
  if (!a.split_variant_of && b.split_variant_of) return -1;
  if (a.split_variant_of && !b.split_variant_of) return 1;
  return (a.date_published ?? "").localeCompare(b.date_published ?? "");
}

async function listGroupsBrief(
  sb: NonNullable<ReturnType<typeof supabaseServerOrNull>>,
): Promise<SplitGroupBrief[]> {
  const { data } = await sb
    .from("split_test_groups")
    .select("id,name,status,goal")
    .eq("source_site", SOURCE_SITE)
    .order("created_at", { ascending: false });
  return (data ?? []) as SplitGroupBrief[];
}

/** Everything the edit-page Split Testing box needs for one article. */
export async function getSplitContextForArticle(
  articleId: string,
): Promise<SplitContext> {
  const sb = supabaseServerOrNull();
  const empty: SplitContext = {
    inGroup: false,
    group: null,
    members: [],
    thisIsControl: false,
    availableGroups: [],
  };
  if (!sb) return empty;

  const { data: self } = await sb
    .from("url_inventory")
    .select(MEMBER_COLS)
    .eq("id", articleId)
    .maybeSingle();
  const row = self as MemberRow | null;

  if (!row?.split_group_id) {
    return { ...empty, availableGroups: await listGroupsBrief(sb) };
  }

  const [{ data: groupRow }, { data: memberRows }] = await Promise.all([
    sb
      .from("split_test_groups")
      .select("id,name,status,goal")
      .eq("id", row.split_group_id)
      .maybeSingle(),
    sb
      .from("url_inventory")
      .select(MEMBER_COLS)
      .eq("split_group_id", row.split_group_id)
      .eq("source_site", SOURCE_SITE),
  ]);

  const members = ((memberRows ?? []) as MemberRow[])
    .slice()
    .sort(sortMembers)
    .map(toMemberView);

  return {
    inGroup: true,
    group: (groupRow as SplitGroupBrief | null) ?? null,
    members,
    thisIsControl: !row.split_variant_of,
    availableGroups: [],
  };
}

export type SplitStat = {
  variant_id: string;
  impressions: number;
  visitors: number;
  cta_clicks: number;
  avg_dwell_ms: number | null;
};

export type SplitGroupFull = {
  group: SplitGroupBrief;
  members: (SplitMemberView & { stat: SplitStat | null })[];
};

/** All groups with their members and first-party stats — for the panel. */
export async function listSplitGroupsWithMembers(): Promise<SplitGroupFull[]> {
  const sb = supabaseServerOrNull();
  if (!sb) return [];

  const groups = await listGroupsBrief(sb);
  if (groups.length === 0) return [];

  const [{ data: memberRows }, { data: stats }] = await Promise.all([
    sb
      .from("url_inventory")
      .select(MEMBER_COLS)
      .in(
        "split_group_id",
        groups.map((g) => g.id),
      )
      .eq("source_site", SOURCE_SITE),
    sb.from("split_test_stats").select("*"),
  ]);

  const statByVariant = new Map<string, SplitStat>();
  for (const s of (stats ?? []) as SplitStat[]) {
    statByVariant.set(s.variant_id, s);
  }

  const membersByGroup = new Map<string, MemberRow[]>();
  for (const m of (memberRows ?? []) as MemberRow[]) {
    if (!m.split_group_id) continue;
    const arr = membersByGroup.get(m.split_group_id) ?? [];
    arr.push(m);
    membersByGroup.set(m.split_group_id, arr);
  }

  return groups.map((group) => ({
    group,
    members: (membersByGroup.get(group.id) ?? [])
      .slice()
      .sort(sortMembers)
      .map((r) => ({
        ...toMemberView(r),
        stat: statByVariant.get(r.id) ?? null,
      })),
  }));
}

// ── Clone an article into a new draft variant ────────────────────────────
// Copies the safe content/SEO fields, mints a fresh unique url_path, copies
// the body (content_items) and every block override (page_block_overrides),
// and stamps the new row into the given group as a variant of `controlId`.
type CloneSource = {
  post_type: string;
  cms_template_id: string | null;
  title: string | null;
  excerpt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  noindex: boolean | null;
  property_id: string | null;
  author_id: string | null;
  url_path: string | null;
};

const CLONE_COLS =
  "post_type,cms_template_id,title,excerpt,meta_title,meta_description,canonical_url,og_image_url,noindex,property_id,author_id,url_path";

async function mintUniquePath(
  sb: ReturnType<typeof supabaseServer>,
  baseSlug: string,
): Promise<string> {
  const { data: existing } = await sb
    .from("url_inventory")
    .select("url_path")
    .eq("source_site", SOURCE_SITE)
    .ilike("url_path", `/${baseSlug}%`);
  const taken = new Set(
    (existing ?? []).map((r) => (r.url_path ?? "").toLowerCase()),
  );
  let slug = baseSlug;
  let n = 2;
  while (taken.has(`/${slug}/`)) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }
  return `/${slug}/`;
}

export async function cloneAsVariant(args: {
  sourceId: string;
  groupId: string;
  controlId: string;
  label: string;
}): Promise<string> {
  const sb = supabaseServer();

  const { data: srcData, error: srcErr } = await sb
    .from("url_inventory")
    .select(CLONE_COLS)
    .eq("id", args.sourceId)
    .single();
  if (srcErr) throw new Error(srcErr.message);
  const src = srcData as CloneSource;

  const baseSlug =
    slugify(src.title ?? "") ||
    slugify((src.url_path ?? "").replace(/\//g, " ")) ||
    "variant";
  const url_path = await mintUniquePath(sb, `${baseSlug}-variant`);
  const url = `${STAGING_BASE}${url_path}`;
  const now = new Date().toISOString();

  const { data: inserted, error: insErr } = await sb
    .from("url_inventory")
    .insert({
      url,
      url_path,
      url_kind: "content",
      post_type: src.post_type,
      source_site: SOURCE_SITE,
      wp_status: "draft",
      title: src.title,
      cms_template_id: src.cms_template_id,
      excerpt: src.excerpt,
      meta_title: src.meta_title,
      meta_description: src.meta_description,
      canonical_url: src.canonical_url,
      og_image_url: src.og_image_url,
      noindex: src.noindex ?? false,
      property_id: src.property_id,
      author_id: src.author_id,
      date_published: now,
      date_modified: now,
      split_group_id: args.groupId,
      split_variant_of: args.controlId,
      split_label: args.label,
      split_weight: 1,
    })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  const newId = inserted.id as string;

  // Copy the body override, if any.
  const { data: body } = await sb
    .from("content_items")
    .select("cms_body_html")
    .eq("url_inventory_id", args.sourceId)
    .maybeSingle();
  if (body?.cms_body_html) {
    await sb.from("content_items").upsert(
      {
        url_inventory_id: newId,
        cms_body_html: body.cms_body_html,
        cms_body_updated_at: now,
      },
      { onConflict: "url_inventory_id" },
    );
  }

  // Copy every per-page block override (re-keyed to the new row).
  const { data: ovrs } = await sb
    .from("page_block_overrides")
    .select("variant_block_id, content")
    .eq("url_inventory_id", args.sourceId);
  if (ovrs && ovrs.length) {
    await sb.from("page_block_overrides").upsert(
      ovrs.map((o) => ({
        url_inventory_id: newId,
        variant_block_id: o.variant_block_id,
        content: o.content,
        updated_at: now,
      })),
      { onConflict: "url_inventory_id,variant_block_id" },
    );
  }

  return newId;
}

// ── Live serving: pick which version a visitor sees ──────────────────────
export type SplitTarget = {
  groupId: string;
  variantId: string; // the url_inventory row to render + attribute events to
  cmsTemplateId: string; // the template to render it with
};

// Deterministic weighted pick, so a given visitor id always resolves to the
// same version (sticky) with no cookie write needed at render time.
function pickWeighted<T extends { id: string; weight: number }>(
  members: T[],
  seed: string,
): T {
  const total = members.reduce((s, m) => s + Math.max(1, m.weight), 0);
  const n = createHash("sha256").update(seed).digest().readUInt32BE(0);
  let target = n % total;
  for (const m of members) {
    const w = Math.max(1, m.weight);
    if (target < w) return m;
    target -= w;
  }
  return members[members.length - 1];
}

/**
 * Given a resolved CONTROL row (published, template-based) and a sticky
 * visitor id, decide which member of its running test to render. Returns null
 * when there's no active test to run (no group, not running, fewer than two
 * usable versions, or the control has no template) — the caller then serves
 * the control normally.
 */
export async function chooseSplitTarget(
  control: {
    id: string;
    cms_template_id: string | null;
    split_group_id: string | null;
    split_variant_of: string | null;
  },
  visitorId: string,
): Promise<SplitTarget | null> {
  if (
    !control.split_group_id ||
    control.split_variant_of || // only the control drives the split
    !control.cms_template_id
  ) {
    return null;
  }
  const sb = supabaseServerOrNull();
  if (!sb) return null;

  const { data: group } = await sb
    .from("split_test_groups")
    .select("status")
    .eq("id", control.split_group_id)
    .maybeSingle();
  if (!group || group.status !== "running") return null;

  const { data: memberRows } = await sb
    .from("url_inventory")
    .select("id, cms_template_id, split_weight, wp_status")
    .eq("split_group_id", control.split_group_id)
    .eq("source_site", SOURCE_SITE);

  // Usable members: a template to render + not trashed. The control is
  // published; variants are drafts but still eligible to be served here.
  const usable = ((memberRows ?? []) as Array<{
    id: string;
    cms_template_id: string | null;
    split_weight: number | null;
    wp_status: string | null;
  }>)
    .filter((m) => m.cms_template_id && m.wp_status !== "trash")
    .map((m) => ({
      id: m.id,
      weight: m.split_weight ?? 1,
      cmsTemplateId: m.cms_template_id as string,
    }))
    .sort((a, b) => a.id.localeCompare(b.id)); // stable order for the hash

  if (usable.length < 2) return null;

  const chosen = pickWeighted(usable, `${visitorId}:${control.split_group_id}`);
  return {
    groupId: control.split_group_id,
    variantId: chosen.id,
    cmsTemplateId: chosen.cmsTemplateId,
  };
}

/** Count existing variants in a group (to compute the next variant label). */
export async function countVariants(groupId: string): Promise<number> {
  const sb = supabaseServer();
  const { count } = await sb
    .from("url_inventory")
    .select("id", { count: "exact", head: true })
    .eq("split_group_id", groupId)
    .not("split_variant_of", "is", null);
  return count ?? 0;
}
