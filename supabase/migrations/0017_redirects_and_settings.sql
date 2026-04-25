-- Phase 4 (Website Builder): redirects + site-wide settings.
--
-- redirects: source_path -> target (URL or path). Resolved by the catch-
-- all router before url_inventory lookup. Type is the HTTP status to
-- emit (301 default).
--
-- site_settings: a single key/value JSONB store for tracking pixels,
-- default meta, and other site-wide knobs. One row per setting key.

create table if not exists public.redirects (
  id           uuid primary key default gen_random_uuid(),
  source_path  text not null unique,
  target       text not null,
  status_code  integer not null default 301
    check (status_code in (301, 302, 307, 308)),
  hits         integer not null default 0,
  last_hit_at  timestamptz,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists redirects_source_idx on public.redirects (source_path);

drop trigger if exists redirects_set_updated_at on public.redirects;
create trigger redirects_set_updated_at
  before update on public.redirects
  for each row execute function public.set_updated_at();

alter table public.redirects enable row level security;

create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now()
);

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

-- Seed: empty containers for each known setting bucket so the Settings
-- UI has something to read on first load. Only insert when missing.
insert into public.site_settings (key, value, description) values
  ('general', '{"site_title":"Anamaya","tagline":"","timezone":"Asia/Kolkata"}'::jsonb,
   'Site title, tagline, timezone'),
  ('default_meta', '{"meta_description":"","og_image_url":""}'::jsonb,
   'Default meta description and OG image used when a page does not set its own'),
  ('tracking', '{"ga4_id":"","gtm_id":"","facebook_pixel_id":"","custom_head_html":"","custom_body_html":""}'::jsonb,
   'Tracking pixels and custom head/body HTML injected on every page')
on conflict (key) do nothing;
