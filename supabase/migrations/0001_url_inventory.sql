-- Phase 1: URL inventory + templates registry
-- Supports WP -> Next.js migration: one row per discovered URL,
-- templates tracked as first-class entities.

create extension if not exists "pgcrypto";

-- ============================================================
-- templates
-- ============================================================
create table public.templates (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  kind              text not null check (kind in ('theme', 'elementor', 'wp-builtin')),
  wp_template_file  text,
  is_archive        boolean not null default false,
  description       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.templates is
  'Rendering templates discovered on the WordPress source site(s). url_inventory rows reference these.';

create index templates_kind_idx on public.templates (kind);

-- ============================================================
-- url_inventory
-- ============================================================
create table public.url_inventory (
  id              uuid primary key default gen_random_uuid(),
  url             text not null unique,
  url_path        text not null,
  url_kind        text not null
                    check (url_kind in ('content', 'archive', 'taxonomy', 'special', 'media')),
  post_type       text,
  template_id     uuid references public.templates(id) on delete set null,
  template_guess  text,
  title           text,
  wp_id           bigint,
  source_flags    jsonb not null default '{}'::jsonb,
  found_in_v1     boolean not null default false,
  found_in_v2     boolean not null default false,
  status          text not null default 'discovered'
                    check (status in ('discovered', 'extracted', 'migrated', 'skipped', 'error')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.url_inventory is
  'Master inventory of every URL discovered on the source WordPress site(s). Populated by Phase 1 extractor.';
comment on column public.url_inventory.url_kind is
  'content=page/post/custom; archive=category/tag/date/author archives; taxonomy=taxonomy term; special=feed/search/404; media=attachment';
comment on column public.url_inventory.template_guess is
  'Pre-extraction guess from URL pattern. template_id is set later when confirmed from WP API.';
comment on column public.url_inventory.source_flags is
  'Which discovery sources saw this URL, e.g. {"sitemap":true,"graphql":true,"crawl":true}';

create index url_inventory_url_path_idx   on public.url_inventory (url_path);
create index url_inventory_url_kind_idx   on public.url_inventory (url_kind);
create index url_inventory_post_type_idx  on public.url_inventory (post_type);
create index url_inventory_template_idx   on public.url_inventory (template_id);
create index url_inventory_status_idx     on public.url_inventory (status);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

create trigger url_inventory_set_updated_at
  before update on public.url_inventory
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS: admin tooling only -- service_role bypasses RLS, no policies = no public access
-- ============================================================
alter table public.templates enable row level security;
alter table public.url_inventory enable row level security;

-- ============================================================
-- Seed: WordPress built-in templates
-- Theme + Elementor templates get added as they are discovered.
-- ============================================================
insert into public.templates (slug, name, kind, is_archive, description) values
  ('wp-home',             'Home / Front Page',  'wp-builtin', false, 'Site root (/)'),
  ('wp-blog-index',       'Blog Index',         'wp-builtin', true,  'Posts archive when separate from front page'),
  ('wp-category-archive', 'Category Archive',   'wp-builtin', true,  '/category/{slug}/'),
  ('wp-tag-archive',      'Tag Archive',        'wp-builtin', true,  '/tag/{slug}/'),
  ('wp-author-archive',   'Author Archive',     'wp-builtin', true,  '/author/{slug}/'),
  ('wp-date-archive',     'Date Archive',       'wp-builtin', true,  '/YYYY/ or /YYYY/MM/'),
  ('wp-search',           'Search Results',     'wp-builtin', true,  '/?s=...'),
  ('wp-feed',             'RSS/Atom Feed',      'wp-builtin', false, '/feed/, /comments/feed/, etc.'),
  ('wp-attachment',       'Attachment Page',    'wp-builtin', false, 'Per-uploaded-media page'),
  ('wp-404',              '404 Not Found',      'wp-builtin', false, 'Fallback for unknown routes'),
  ('wp-paginated',        'Paginated Archive',  'wp-builtin', true,  '/.../page/N/');
