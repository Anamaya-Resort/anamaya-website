-- ============================================================
-- 0063: Template column layout (1 or 2 columns, aside on either side)
--
-- A template variant now chooses its layout explicitly instead of it being
-- inferred. one_col = single column (default, every existing template).
-- two_col = main column + a side column of vertical blocks, on the left or
-- right per aside_position.
--
-- Applied via the management API; recorded here. Idempotent.
-- ============================================================

alter table public.page_template_variants
  add column if not exists layout text not null default 'one_col'
  check (layout in ('one_col', 'two_col'));

alter table public.page_template_variants
  add column if not exists aside_position text not null default 'right'
  check (aside_position in ('left', 'right'));
