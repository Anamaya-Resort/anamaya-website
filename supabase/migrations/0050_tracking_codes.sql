-- Tracking code storage for template-level and per-page tracking.
--
-- Global tracking already lives in site_settings (key='tracking') with the
-- structured GA4/GTM/Pixel ids plus custom_head_html / custom_body_html.
-- These two tables add the other two scopes the admin Tracking Code page
-- manages: per-template and per-page head/footer snippets. Each level layers
-- on top of the ones above it (global → template → page).

create table if not exists public.template_tracking (
  template_slug text primary key,          -- matches post_type templateSlug, e.g. 'single-post'
  head_html     text not null default '',  -- injected into <head> for pages of this template
  body_html     text not null default '',  -- injected at end of <body> (footer) for this template
  updated_at    timestamptz not null default now()
);
drop trigger if exists template_tracking_set_updated_at on public.template_tracking;
create trigger template_tracking_set_updated_at
  before update on public.template_tracking
  for each row execute function public.set_updated_at();

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
