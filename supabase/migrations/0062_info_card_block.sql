-- ============================================================
-- 0062: Info Card block (the first VERTICAL block)
--
-- A compact side-column card: heading, a highlighted value (e.g. a price),
-- quick-fact rows, and a button. shape = 'vertical', so it belongs in the
-- side column of a two-column template. Carries a responsive_mode
-- (fixed | hidden) read by the two-column renderer.
--
-- Idempotent. Seeds one instance with sample content so it previews well.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order, shape)
values
  ('info_card', 'Info Card',
     'A compact vertical side-column card: heading, a highlighted value (e.g. a price), quick-fact rows, and a button. The first vertical block, built for the side column of a two-column template.',
     false, true, 103, 'vertical')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      is_overlay = excluded.is_overlay,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order,
      shape = excluded.shape;

insert into public.blocks (slug, type_slug, name, content)
values (
  'info_card_1', 'info_card', 'Info Card',
  '{"heading":"This Retreat","subheading":"7 nights, all-inclusive","highlight_label":"From","highlight_value":"$895","rows":[{"label":"Dates","value":"Sep 12 to 19"},{"label":"Length","value":"7 nights"},{"label":"Level","value":"All levels"}],"cta_label":"Book Now","cta_href":"https://anamaya.secure.retreat.guru/","responsive_mode":"fixed"}'::jsonb
)
on conflict (slug) do nothing;
