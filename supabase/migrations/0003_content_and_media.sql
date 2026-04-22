-- Phase 3+4+5 foundation: content bodies, Elementor data, post meta, media.
-- Fed by scripts/extractor/extract-content.ts and discover-media.ts.
-- RLS: admin-only (no policies, service_role bypasses).

-- ============================================================
-- media_items: one row per WP media attachment, per site.
-- ============================================================
create table public.media_items (
  id              uuid primary key default gen_random_uuid(),
  source_site     text not null,
  wp_id           bigint not null,
  source_url      text,
  mime_type       text,
  media_type      text,
  title           text,
  alt_text        text,
  caption         text,
  description     text,
  width           integer,
  height          integer,
  file_size_bytes bigint,
  sizes           jsonb,
  storage_url     text,   -- populated when migrated to Supabase Storage (Phase 5)
  storage_key     text,
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (source_site, wp_id)
);
create index media_items_source_site_idx on public.media_items (source_site);
create index media_items_mime_idx        on public.media_items (mime_type);

create trigger media_items_set_updated_at
  before update on public.media_items
  for each row execute function public.set_updated_at();

alter table public.media_items enable row level security;

-- ============================================================
-- content_items: body HTML, Elementor JSON, ACF, post meta.
-- One row per url_inventory content row.
-- ============================================================
create table public.content_items (
  url_inventory_id   uuid primary key references public.url_inventory(id) on delete cascade,
  content_rendered   text,   -- content.rendered from REST (HTML)
  content_raw        text,   -- content.raw with context=edit (shortcodes, not rendered)
  excerpt_rendered   text,
  elementor_data     jsonb,  -- parsed _elementor_data post meta (null if not Elementor-built)
  acf                jsonb,  -- ACF fields when exposed
  post_meta          jsonb,  -- full meta blob excluding _elementor_data (already its own column)
  content_hash       text,   -- sha256 of content_rendered — for v1/v2 reconciliation
  extracted_at       timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index content_items_hash_idx on public.content_items (content_hash);

create trigger content_items_set_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();

alter table public.content_items enable row level security;
