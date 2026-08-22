-- ============================================================
-- 0064: Retreat template blocks — Retreat Leader (vertical) + Retreat
-- Overview & Rates (horizontal)
--
-- The two new blocks the retreat template needs:
--   - retreat_leader: side-column teacher card. Live from AnamayOS
--     (persons + retreat_leader_profiles) via ao_person_id when set and
--     resolvable; otherwise the manual name/photo/bio fields, which the
--     retreat conversion pipeline pre-fills from the legacy page's
--     scraped bio.
--   - retreat_rates: main-column dates/price/spots/Book bar. Live from
--     AnamayOS retreats.pricing_options (the field actually populated
--     today, unlike the near-empty retreat_pricing_tiers table) via
--     retreat_id; otherwise the manual tier list scraped from the
--     legacy page.
--
-- Seeds one instance of each against the real "Wild by Nature" retreat
-- (AnamayOS id 5eb0a8e8-2467-4432-91d6-722101907c82) so both new retreat
-- template designs preview with real data end to end.
--
-- Idempotent.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order, shape)
values
  ('retreat_leader', 'Retreat Leader',
     'Vertical side-column teacher card for a retreat template. Live from AnamayOS when linked, else the manual bio scraped from the legacy page.',
     false, true, 104, 'vertical'),
  ('retreat_rates', 'Retreat Overview & Rates',
     'Horizontal dates/price/spots/Book bar for a retreat template''s main column, typically placed under the hero. Live from AnamayOS pricing when a retreat is linked, else the manual fallback tiers.',
     false, true, 42, 'horizontal')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      is_overlay = excluded.is_overlay,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order,
      shape = excluded.shape;

insert into public.blocks (slug, type_slug, name, content)
values (
  'retreat_leader_wbn_angela', 'retreat_leader', 'Retreat Leader — Angela Boltz (Wild by Nature)',
  '{"responsive_mode": "fixed", "role": "Lead Teacher", "name": "Angela Boltz", "photo_url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/64f23082-a9a9-40d0-9619-85dcf9df650d/gallery/angela-boltz-31b825b6.jpg", "bio_html": "<p><strong>Angela Boltz</strong> is an internationally recognized yoga and meditation teacher whose work opens a door for women to develop intimacy with their lives, grounding into a deep, unwavering trust in their own capacity for direct knowing.</p><p>Born from 20+ years as a women\u2019s holistic wellness educator, her teaching is an integrative, feminine approach to well-being: a rich fusion of traditional wisdom, deep rest, and self-inquiry. She spent years living in Costa Rica and traveling the world as a teacher\u2019s teacher, and is also a writer, artist, and ceremonialist.</p><p>Her methodology, <strong>Embodied Rewilding\u2122</strong>, weaves yoga, tantra, mindfulness, ecosomatics, and flow psychology into a path for women to reset their inner compass, align with the rhythm of nature, and move through life with sensual fullness and true belonging.</p><p>A Yoga Alliance accredited teacher since 2003 and teacher trainer since 2008, Angela has directed twelve major training programs across the U.S., Costa Rica, Nicaragua, and Panama, and co-produced the Montezuma Gathering music and wellness festival in 2011. Her teaching draws from 25+ years on her mat, a devoted meditation practice, and a degree in Cultural Anthropology focused on Comparative Eastern Religions.</p>", "link_label": "", "link_href": ""}'::jsonb
)
on conflict (slug) do nothing;

insert into public.blocks (slug, type_slug, name, content)
values (
  'retreat_rates_wbn', 'retreat_rates', 'Retreat Rates — Wild by Nature',
  '{"retreat_id": "5eb0a8e8-2467-4432-91d6-722101907c82", "heading": "Dates & Rates", "manual_dates_text": "Sept 12 \u2013 19, 2026", "manual_tiers": [{"name": "Dorm", "price": "$1,095"}, {"name": "Triple", "price": "$1,295"}, {"name": "Double", "price": "$1,595"}, {"name": "Single", "price": "$2,195"}], "manual_spots_text": "", "manual_cta_label": "Book Now", "manual_cta_href": "https://anamaya.secure.retreat.guru/program/wild-by-nature-yoga-retreat-angela-boltz/?form=1&lang=en", "container_width_px": 1200, "padding_y_px": 32}'::jsonb
)
on conflict (slug) do nothing;
