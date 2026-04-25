-- Phase 4 audit pass + LLM readiness.
--
-- Adds structured destinations for the AI rewrite phase:
--   * Per-page SEO override columns on url_inventory. AI rewrites of
--     title/meta/OG land here. All nullable so they fall back to either
--     the page's own values (title) or site_settings.default_meta.
--   * noindex flag so AI-generated drafts can be hidden from search until
--     reviewed.
--   * AI provenance columns on content_items. Track which body was last
--     AI-touched, when, with what model, and which kind of edit
--     ('title'|'excerpt'|'body'|'meta'|'section'). Used by the AI panel
--     for telemetry and "review AI changes" workflows.

alter table public.url_inventory
  add column if not exists meta_title       text,
  add column if not exists meta_description text,
  add column if not exists canonical_url    text,
  add column if not exists og_image_url     text,
  add column if not exists noindex          boolean not null default false;

comment on column public.url_inventory.meta_title is
  'Per-page <title> override; falls back to title.';
comment on column public.url_inventory.meta_description is
  'Per-page <meta name="description"> override; falls back to site_settings.default_meta.meta_description.';
comment on column public.url_inventory.canonical_url is
  'Per-page <link rel="canonical"> override; falls back to url_path on the live origin.';
comment on column public.url_inventory.og_image_url is
  'Per-page og:image override; falls back to site_settings.default_meta.og_image_url.';
comment on column public.url_inventory.noindex is
  'When true, render <meta name="robots" content="noindex,nofollow">. Useful for AI drafts before review.';

alter table public.content_items
  add column if not exists ai_last_model   text,
  add column if not exists ai_last_edit_at timestamptz,
  add column if not exists ai_last_kind    text;

comment on column public.content_items.ai_last_model is
  'Model id of the most recent AI-assisted edit, e.g. claude-opus-4-7.';
comment on column public.content_items.ai_last_edit_at is
  'Timestamp of the most recent AI-assisted edit.';
comment on column public.content_items.ai_last_kind is
  'What was AI-edited last: title|excerpt|body|meta|section. Free-form to allow new kinds without migration.';
