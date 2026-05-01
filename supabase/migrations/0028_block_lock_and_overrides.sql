-- ============================================================
-- 0028: Lock/unlock blocks per template + per-page overrides
--
-- Until now, every block in a template was effectively shared:
-- editing the master block changed it on every page using the
-- template, and there was no per-page customization. This
-- migration introduces two pieces:
--
--   1. is_locked on page_template_variant_blocks — set per-slot
--      in the template editor. Locked = the master block's
--      content always renders. Unlocked = the page using this
--      template can supply per-page content via the override
--      table below. New rows lock by default; admins explicitly
--      unlock the slots they want page-specific.
--
--   2. page_block_overrides — a per-page, per-variant-slot
--      override of the block's content. When the renderer
--      encounters an unlocked slot AND finds an override row,
--      it renders the override content instead of the master.
--
-- The renderer fall-back chain when rendering a templated page:
--   locked slot                 -> master block content
--   unlocked + has override     -> override content
--   unlocked + no override yet  -> master block content
-- (so unlocked slots without authored content still render
-- something sensible.)
-- ============================================================

alter table public.page_template_variant_blocks
  add column if not exists is_locked boolean not null default true;

create table if not exists public.page_block_overrides (
  id                uuid primary key default gen_random_uuid(),
  url_inventory_id  uuid not null references public.url_inventory(id) on delete cascade,
  variant_block_id  uuid not null references public.page_template_variant_blocks(id) on delete cascade,
  content           jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (url_inventory_id, variant_block_id)
);

create index if not exists page_block_overrides_page_idx
  on public.page_block_overrides(url_inventory_id);

drop trigger if exists page_block_overrides_set_updated_at on public.page_block_overrides;
create trigger page_block_overrides_set_updated_at
  before update on public.page_block_overrides
  for each row execute function public.set_updated_at();
