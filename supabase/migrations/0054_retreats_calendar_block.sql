-- ============================================================
-- 0054: Retreats Calendar block type
--
-- Public, on-brand replacement for the Retreat Guru rg-calendar embed
-- (lives at /book-retreat). Async server block: lists every upcoming
-- retreat from AnamayaOS (is_public + is_active + status='confirmed' +
-- future start_date), optionally grouped by month. Each row's Book
-- button links out to Retreat Guru — booking always stays external.
-- No per-instance retreat data; the list IS the AO data.
--
-- Fully idempotent.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order)
values
  ('retreats_calendar', 'Retreats Calendar',
     'Auto-populated calendar of upcoming retreats from AnamayaOS (public + confirmed + future start date), grouped by month. Each row shows the retreat''s image, dates, name and a Book button that links out to Retreat Guru.',
     false, true, 101)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      is_overlay = excluded.is_overlay,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order;

-- Seed one usable block instance so it can be previewed and dropped into
-- the /book-retreat page. Defaults live in the renderer, so empty content
-- is fine.
insert into public.blocks (slug, type_slug, name, content)
values ('retreats_calendar_1', 'retreats_calendar', 'Retreats Calendar', '{}'::jsonb)
on conflict (slug) do nothing;
