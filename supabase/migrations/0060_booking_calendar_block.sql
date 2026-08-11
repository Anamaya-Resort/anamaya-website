-- ============================================================
-- 0060: Booking Calendar block type
--
-- Interactive Saturday-to-Saturday retreats calendar fed live from
-- AnamayOS (public + active + confirmed + upcoming). Content is just
-- gating: retreat_type (all | ytt | retreat) and only_available. The
-- calendar's look is fixed; booking hands off to Retreat Guru.
--
-- Idempotent. Seeds one instance so it can be previewed and dropped onto
-- a template.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order)
values
  ('booking_calendar', 'Booking Calendar',
     'Interactive Sat-to-Sat retreats calendar with a details tower, fed live from AnamayaOS. Gate by retreat type (all, YTTs only, weekly retreats only) and only-available. Booking links out to Retreat Guru.',
     false, true, 102)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      is_overlay = excluded.is_overlay,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order;

insert into public.blocks (slug, type_slug, name, content)
values ('booking_calendar_1', 'booking_calendar', 'Booking Calendar', '{}'::jsonb)
on conflict (slug) do nothing;
