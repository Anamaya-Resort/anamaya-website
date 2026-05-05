-- ============================================================
-- 0046: image_slideshow block type
--
-- Full-width slideshow that crossfades between editor-uploaded
-- images. Each slide can carry its own text overlay; font, size,
-- colour and stroke (border around letters) are global so the
-- whole rotation stays consistent. Editor controls per-slide
-- order, image upload, per-slide text, plus global font / colour /
-- stroke / display + crossfade timing.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order)
values
  ('image_slideshow', 'Image Slideshow',
     'Full-width slideshow that crossfades between editor-uploaded images. Per-slide text overlay; global font, colour, and letter-stroke (border) controls.',
     false, true, 115)
on conflict (slug) do update
  set name        = excluded.name,
      description = excluded.description,
      is_overlay  = excluded.is_overlay,
      is_active   = excluded.is_active,
      sort_order  = excluded.sort_order;
