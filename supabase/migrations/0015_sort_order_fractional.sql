-- Allow fractional sort_order so inserts between consecutive rows don't
-- fail. The insert-between logic picks the midpoint of two existing
-- sort_orders; with an integer column (10, 11) the midpoint 10.5
-- rejects with "invalid input syntax for type integer".
--
-- double precision is plenty of headroom; we never reach the precision
-- limit in practice because each insert halves the gap, and gaps rarely
-- get below ~1e-10.

alter table public.page_template_variant_blocks
  alter column sort_order type double precision
  using sort_order::double precision;
