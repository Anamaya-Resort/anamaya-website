-- ============================================================
-- 0061: Block shape (horizontal | vertical)
--
-- Horizontal blocks (default, everything today) fill the main column.
-- Vertical blocks are built for the side column of a two-column template;
-- when a template has vertical blocks the main column narrows to make room.
--
-- Applied via the management API; recorded here. Idempotent.
-- ============================================================

alter table public.block_types
  add column if not exists shape text not null default 'horizontal'
  check (shape in ('horizontal', 'vertical'));
