-- ============================================================
-- 0035: google_map_with_text block type
--
-- Sibling of image_text — same two-column layout primitive — but the
-- image cell is replaced with an embedded interactive Google Map
-- iframe. The user can pan + zoom inside the iframe, and a small
-- corner link opens the full Google Maps tab in a new window.
--
-- Uses Google's keyless `output=embed` URL so no API key is needed.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order)
values
  ('google_map_with_text', 'Google Map with Text',
     'Two-column block with an interactive Google Map on one side and free HTML on the other. Editor enters latitude, longitude, and zoom; an "Open in Google Maps" link in the corner launches the full Maps tab.',
     false, true, 100)
on conflict (slug) do update
  set name        = excluded.name,
      description = excluded.description,
      is_overlay  = excluded.is_overlay,
      is_active   = excluded.is_active,
      sort_order  = excluded.sort_order;
