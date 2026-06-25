-- ============================================================
-- 0052: Activate page→template assignment + wire the homepage.
--
-- Brings the live DB up to what the Website Builder code already
-- expects so that assigning a template to a page can actually SAVE:
--   * url_inventory.cms_template_id  — which template a page renders with
--   * content_items                  — CMS / migrated-WP / snapshot body storage
--   * page_tracking, template_tracking — per-page & per-template tracking snippets
--
-- Then points the existing "/" homepage row at the already-built
-- "Home Page v1" template (slug 'home') so "/" renders it instead of
-- the static scaffold.
--
-- Fully idempotent — safe to run more than once.
-- ============================================================

-- Shared updated_at trigger fn (no-op replace if already present).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Content bodies (CMS-authored, migrated WP HTML, and frozen snapshot),
-- one row per url_inventory page.
create table if not exists public.content_items (
  url_inventory_id    uuid primary key references public.url_inventory(id) on delete cascade,
  content_rendered    text,
  content_raw         text,
  excerpt_rendered    text,
  elementor_data      jsonb,
  acf                 jsonb,
  post_meta           jsonb,
  content_hash        text,
  extracted_at        timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.content_items
  add column if not exists scraped_body_html   text,
  add column if not exists scraped_at          timestamptz,
  add column if not exists cms_body_html       text,
  add column if not exists cms_body_updated_at timestamptz,
  add column if not exists frozen_html         text,
  add column if not exists frozen_at           timestamptz;
alter table public.content_items enable row level security;
drop trigger if exists content_items_set_updated_at on public.content_items;
create trigger content_items_set_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();

-- Which CMS template a page renders with. Null = legacy body fallback.
alter table public.url_inventory
  add column if not exists cms_template_id uuid
    references public.page_templates(id) on delete set null;
create index if not exists url_inventory_cms_template_idx
  on public.url_inventory (cms_template_id);

-- Per-template tracking snippets.
create table if not exists public.template_tracking (
  template_slug text primary key,
  head_html     text not null default '',
  body_html     text not null default '',
  updated_at    timestamptz not null default now()
);
drop trigger if exists template_tracking_set_updated_at on public.template_tracking;
create trigger template_tracking_set_updated_at
  before update on public.template_tracking
  for each row execute function public.set_updated_at();

-- Per-page tracking snippets.
create table if not exists public.page_tracking (
  url_inventory_id uuid primary key references public.url_inventory(id) on delete cascade,
  head_html        text not null default '',
  body_html        text not null default '',
  updated_at       timestamptz not null default now()
);
drop trigger if exists page_tracking_set_updated_at on public.page_tracking;
create trigger page_tracking_set_updated_at
  before update on public.page_tracking
  for each row execute function public.set_updated_at();

-- Ensure the "/" row is its own post type (no-op if already done).
update public.url_inventory
   set post_type = 'homepage'
 where url_path = '/' and post_type = 'page' and source_site = 'v2';

-- Wire the homepage to the existing "Home Page v1" template (slug 'home').
update public.url_inventory u
   set cms_template_id = (select id from public.page_templates where slug = 'home' limit 1)
 where u.post_type = 'homepage' and u.source_site = 'v2' and u.url_path = '/';
