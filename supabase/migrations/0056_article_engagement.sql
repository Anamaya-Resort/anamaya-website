-- Phase 1 — Article engagement foundation.
--
-- Powers: (1) the reaction widget on every article — LIKE(1) / LOVE(2) /
-- MARRY(3), points 1/2/5 -> "love score"; (2) unique per-article view
-- counts (logged-in staff excluded at write time, repeat same-IP deduped);
-- (3) a Featured flag on any page/post, shown in the blog right column.
--
-- Writes happen ONLY server-side (the /api/reactions endpoint and the
-- article routes) using the service-role client, so RLS stays enabled with
-- no public policies — anon/browser cannot touch these tables directly.
--
-- url_path is stored CANONICAL (leading slash, no trailing slash) — same
-- form as canonicalizeSourcePath() in src/lib/website-builder/redirects.ts —
-- so joins to url_inventory must canonicalize both sides.

-- ── Featured flag on pages/posts ──────────────────────────────────────
alter table public.url_inventory
  add column if not exists featured boolean not null default false;
create index if not exists url_inventory_featured_idx
  on public.url_inventory (featured) where featured;

-- ── Reactions: one row per visitor device per article (changeable) ────
create table if not exists public.article_reactions (
  id          uuid primary key default gen_random_uuid(),
  url_path    text not null,
  visitor_id  text not null,                 -- random id from the device (localStorage)
  level       smallint not null check (level in (1, 2, 3)),  -- 1=LIKE 2=LOVE 3=MARRY
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (url_path, visitor_id)              -- one vote per device per article; upsert to change
);
create index if not exists article_reactions_path_idx
  on public.article_reactions (url_path);

drop trigger if exists article_reactions_set_updated_at on public.article_reactions;
create trigger article_reactions_set_updated_at
  before update on public.article_reactions
  for each row execute function public.set_updated_at();

alter table public.article_reactions enable row level security;

-- ── Views: one row per (article, hashed IP) ───────────────────────────
-- Staff (logged-in) are filtered out BEFORE insert, so they never create a
-- row. Repeat views from the same IP collapse via the unique constraint,
-- so a count of rows ≈ unique human viewers. IP is stored HASHED (salted),
-- never raw, so no personal data is retained.
create table if not exists public.article_views (
  id          uuid primary key default gen_random_uuid(),
  url_path    text not null,
  ip_hash     text not null,
  created_at  timestamptz not null default now(),
  unique (url_path, ip_hash)
);
create index if not exists article_views_path_idx
  on public.article_views (url_path);

alter table public.article_views enable row level security;

-- ── Aggregated engagement per article ─────────────────────────────────
-- A VIEW (not a table) so totals are always correct with no triggers to
-- drift. love_score = 1*LIKE + 2*LOVE + 5*MARRY. Read server-side only.
create or replace view public.article_engagement as
with r as (
  select url_path,
         count(*) filter (where level = 1) as like1_count,
         count(*) filter (where level = 2) as like2_count,
         count(*) filter (where level = 3) as like3_count
  from public.article_reactions
  group by url_path
),
v as (
  select url_path, count(*) as view_count
  from public.article_views
  group by url_path
)
select
  coalesce(r.url_path, v.url_path)                         as url_path,
  coalesce(r.like1_count, 0)                               as like1_count,
  coalesce(r.like2_count, 0)                               as like2_count,
  coalesce(r.like3_count, 0)                               as like3_count,
  coalesce(r.like1_count, 0)
    + 2 * coalesce(r.like2_count, 0)
    + 5 * coalesce(r.like3_count, 0)                       as love_score,
  coalesce(v.view_count, 0)                                as view_count
from r
full outer join v on r.url_path = v.url_path;
