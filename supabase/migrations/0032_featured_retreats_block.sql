-- ============================================================
-- 0032: Featured Retreats block type
--
-- Auto-populated grid of retreats from AO whose is_featured flag is
-- true. The block has no per-instance retreat data — to change which
-- retreats show, an admin flips is_featured in AnamayaOS. The editor
-- only controls the section heading, sub-text, CTA label, max count,
-- the per-retreat URL pattern, and styling.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order)
values
  ('featured_retreats', 'Featured Retreats',
     'Auto-populated grid of retreats marked is_featured in AnamayaOS. Each card shows the retreat''s feature image, name, dates, and excerpt; image + Register-Now button both link to the retreat page.',
     false, true, 100)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      is_overlay = excluded.is_overlay,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order;
