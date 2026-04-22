-- Phase 1 comprehensive redo: multi-site support, per-post metadata, authors, taxonomies, SEO.
-- Adds everything Phase 1 should have had from the start.
--
-- Runs after 0001_url_inventory.sql. Safe to apply to populated data:
--   - Existing url_inventory rows get source_site='v1' (default)
--   - New columns are nullable; extractors backfill on re-run
--   - Old unique(url) constraint replaced with unique(source_site, url)

-- ============================================================
-- authors: one row per (source_site, WP user id)
-- ============================================================
create table public.authors (
  id            uuid primary key default gen_random_uuid(),
  source_site   text not null,
  wp_id         bigint not null,
  slug          text,
  display_name  text,
  description   text,
  avatar_url    text,
  archive_url   text,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (source_site, wp_id)
);
create index authors_slug_idx on public.authors (slug);
create index authors_source_site_idx on public.authors (source_site);

create trigger authors_set_updated_at
  before update on public.authors
  for each row execute function public.set_updated_at();

alter table public.authors enable row level security;

-- ============================================================
-- taxonomy_terms: per-site, per-taxonomy term records
-- ============================================================
create table public.taxonomy_terms (
  id            uuid primary key default gen_random_uuid(),
  source_site   text not null,
  taxonomy      text not null,
  wp_id         bigint not null,
  slug          text,
  name          text,
  description   text,
  parent_wp_id  bigint,
  post_count    integer,
  archive_url   text,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (source_site, taxonomy, wp_id)
);
create index taxonomy_terms_taxonomy_idx on public.taxonomy_terms (taxonomy);
create index taxonomy_terms_slug_idx on public.taxonomy_terms (slug);
create index taxonomy_terms_source_site_idx on public.taxonomy_terms (source_site);

create trigger taxonomy_terms_set_updated_at
  before update on public.taxonomy_terms
  for each row execute function public.set_updated_at();

alter table public.taxonomy_terms enable row level security;

-- ============================================================
-- url_inventory: new columns + constraint swap
-- ============================================================

-- Drop the old single-site unique on url
alter table public.url_inventory drop constraint url_inventory_url_key;

alter table public.url_inventory
  add column source_site           text not null default 'v1',
  add column date_published        timestamptz,
  add column date_modified         timestamptz,
  add column wp_status             text,
  add column parent_wp_id          bigint,
  add column featured_media_wp_id  bigint,
  add column menu_order            integer,
  add column wp_template           text,
  add column excerpt               text,
  add column author_id             uuid references public.authors(id) on delete set null;

alter table public.url_inventory
  add constraint url_inventory_site_url_key unique (source_site, url);

create index url_inventory_source_site_idx    on public.url_inventory (source_site);
create index url_inventory_date_modified_idx  on public.url_inventory (date_modified);
create index url_inventory_date_published_idx on public.url_inventory (date_published);
create index url_inventory_author_idx         on public.url_inventory (author_id);
create index url_inventory_parent_wp_id_idx   on public.url_inventory (parent_wp_id);

comment on column public.url_inventory.source_site is
  'Which source WP site this row was extracted from. Values: v1 (anamaya.com), v2 (anamayastg.wpenginepowered.com)';
comment on column public.url_inventory.wp_template is
  'WP theme template override (from post meta _wp_page_template). Orthogonal to template_id which is the rendering template slug.';

-- ============================================================
-- post_terms: junction between url_inventory and taxonomy_terms
-- ============================================================
create table public.post_terms (
  url_inventory_id  uuid not null references public.url_inventory(id) on delete cascade,
  taxonomy_term_id  uuid not null references public.taxonomy_terms(id) on delete cascade,
  created_at        timestamptz not null default now(),
  primary key (url_inventory_id, taxonomy_term_id)
);
create index post_terms_term_idx on public.post_terms (taxonomy_term_id);

alter table public.post_terms enable row level security;

-- ============================================================
-- seo_meta: Yoast / OpenGraph / schema.org per URL
-- ============================================================
create table public.seo_meta (
  url_inventory_id    uuid primary key references public.url_inventory(id) on delete cascade,
  meta_title          text,
  meta_description    text,
  canonical_url       text,
  og_title            text,
  og_description      text,
  og_image            text,
  og_type             text,
  twitter_title       text,
  twitter_description text,
  twitter_image       text,
  robots              jsonb,
  schema_ld           jsonb,
  raw                 jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger seo_meta_set_updated_at
  before update on public.seo_meta
  for each row execute function public.set_updated_at();

alter table public.seo_meta enable row level security;
