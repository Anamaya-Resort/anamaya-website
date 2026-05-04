-- ============================================================
-- 0041: testimonials block type
--
-- Full-width carousel of featured testimonials from a chosen
-- category. Editor picks one category slug; the renderer pulls only
-- the rows in testimonial_set_items where featured = true for that
-- set, server-renders all of them as a Quotation-schema-friendly
-- HTML list, and a small client island handles the 4s display +
-- 2s crossfade rotation.
--
-- Layout (matches anamaya.com homepage testimonials section):
--   - "TESTIMONIALS" headline
--   - Each slide: Testimonial title (h3), italic body in quotes,
--     attribution line ("Trip Advisor Review · <date>" → "Full Review")
--     and the TripAdvisor 5-star graphic.
--
-- Visuals: bg color, optional bg image with opacity + blend mode.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order)
values
  ('testimonials', 'Testimonials',
     'Full-width carousel of featured guest testimonials from one category. Pulls only featured rows from the chosen testimonial category, auto-rotates with a 4s display + 2s crossfade, and includes the TripAdvisor 5-star badge. Background colour, image overlay with opacity + blend mode.',
     false, true, 110)
on conflict (slug) do update
  set name        = excluded.name,
      description = excluded.description,
      is_overlay  = excluded.is_overlay,
      is_active   = excluded.is_active,
      sort_order  = excluded.sort_order;
