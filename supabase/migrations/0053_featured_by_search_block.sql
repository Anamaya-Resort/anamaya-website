-- ============================================================
-- 0053: "Featured by Search" block + retreat embeddings cache.
--
-- A second retreats block that, instead of the is_featured flag, uses
-- our AI to recommend the upcoming retreats most relevant to a context:
-- either the current page/post's content or a search phrase the builder
-- types. Ranking is by semantic similarity (OpenAI embeddings), which is
-- much smarter than keyword search.
--
-- retreat_embeddings caches one embedding per retreat (in the website
-- DB) so we only call OpenAI when a retreat's text changes. Retreats
-- themselves live in AnamayaOS; this table is keyed by their id.
--
-- Idempotent — safe to run more than once.
-- ============================================================

create table if not exists public.retreat_embeddings (
  retreat_id   uuid primary key,
  content_hash text not null,
  embedding    jsonb not null,
  embedded_at  timestamptz not null default now()
);
alter table public.retreat_embeddings enable row level security;

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order)
values
  ('featured_by_search', 'Featured by Search',
     'AI-recommended retreats ranked by relevance to a search phrase or the current page''s content (semantic match, not keywords). Same card design as Featured Retreats; choose the context in the editor.',
     false, true, 101)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      is_overlay = excluded.is_overlay,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order;
