-- ============================================================
-- 0034: small_form_over_image block type
--
-- Full-width banner with a Sereenly form (first/last name + phone +
-- email) embedded inside a centred card. Banner has its own bg
-- colour + optional bg image (with opacity + mix-blend-mode); the
-- card sits on top with its own bg colour (always 100 % opaque) +
-- optional bg image (also opacity + blend mode).
--
-- Defaults are scraped from anamaya.com's homepage signup section:
--   - Heading: "don't miss a thing..."
--   - Subheading: "Want to receive our emails for special promotions,
--     discounts and first time access?"
--   - Sereenly form id: 3VbotiuGfLgRUdIpi2ro ("Newsletter Home Page")
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order)
values
  ('small_form_over_image', 'Small Form Over Image',
     'Full-width banner with a Sereenly newsletter form on a centred card. Banner has its own background colour + image (opacity / blend mode); card has its own opaque colour + optional translucent image. Defaults to anamaya.com''s homepage signup form.',
     false, true, 100)
on conflict (slug) do update
  set name        = excluded.name,
      description = excluded.description,
      is_overlay  = excluded.is_overlay,
      is_active   = excluded.is_active,
      sort_order  = excluded.sort_order;
