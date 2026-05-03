-- ============================================================
-- 0033: Three-column block type
--
-- Self-contained three-column section. Unlike two_column (which
-- nests other block types per side), three_column owns its column
-- data directly: each column has its own heading + image + body
-- HTML + optional CTA, all with full font controls.
--
-- The 7-track layout (gutter / col / space / col / space / col /
-- gutter) is sized via fr units in the renderer, so the editor's
-- percentages auto-normalise — non-100 totals scale proportionally
-- rather than breaking the layout.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order)
values
  ('three_column', 'Three-Column Section',
     'Full-width section with three columns plus configurable left/right gutters and inter-column spaces. Section-level heading + background (color + optional image); each column has its own heading, image, body HTML, and optional CTA.',
     false, true, 100)
on conflict (slug) do update
  set name        = excluded.name,
      description = excluded.description,
      is_overlay  = excluded.is_overlay,
      is_active   = excluded.is_active,
      sort_order  = excluded.sort_order;
