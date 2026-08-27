-- ============================================================
-- 0074: Teacher's Retreats blocks (upcoming + past) on the retreat
-- leader template
--
-- Two new blocks, live from AnamayOS: retreats where the page's
-- ao_person_id is the leader or a co-teacher, split into upcoming
-- (soonest first) and past (most recent first). Each renders NOTHING
-- when that teacher has no retreats in that direction -- no empty
-- section, per spec.
--
-- The shared default block instances point at a real, already-linked
-- AnamayOS teacher (Cristiane Machado, 3 upcoming + 13 past) purely so
-- the admin template editor's preview shows real cards instead of
-- another blank box -- same lesson as the profile block's placeholder.
-- Angela Boltz's page override is left with no person ID (she has no
-- AnamayOS link yet), so both sections correctly show nothing there.
--
-- Idempotent.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order, shape)
values
  ('teacher_retreats_upcoming', 'Teacher''s Upcoming Retreats',
     'Live AnamayOS list of a retreat leader''s upcoming retreats. Renders nothing when they have none scheduled.',
     false, true, 44, 'horizontal'),
  ('teacher_retreats_past', 'Teacher''s Past Retreats',
     'Live AnamayOS list of a retreat leader''s past retreats. Renders nothing when they have none yet.',
     false, true, 45, 'horizontal')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      is_overlay = excluded.is_overlay,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order,
      shape = excluded.shape;

insert into public.blocks (slug, type_slug, name, content)
values
  ('teacher_retreats_upcoming_default', 'teacher_retreats_upcoming', 'Teacher''s Upcoming Retreats', '{"ao_person_id": "ee6e48a8-2116-45ea-9b6c-a7f344e10bd7", "heading": "Upcoming Retreats", "register_label": "Register Now"}'::jsonb),
  ('teacher_retreats_past_default', 'teacher_retreats_past', 'Teacher''s Past Retreats', '{"ao_person_id": "ee6e48a8-2116-45ea-9b6c-a7f344e10bd7", "heading": "Past Retreats", "register_label": "View Retreat"}'::jsonb)
on conflict (slug) do nothing;

insert into public.page_template_variant_blocks (page_template_variant_id, block_id, sort_order, is_locked)
select v.id, b.id, o.sort_order, false
from public.page_template_variants v
join public.page_templates t on t.id = v.page_template_id and t.slug = 'single-retreat_leader' and v.slug = 'default'
join (values
  ('teacher_retreats_upcoming_default', 20),
  ('teacher_retreats_past_default', 30)
) as o(block_slug, sort_order) on true
join public.blocks b on b.slug = o.block_slug
on conflict do nothing;

-- Angela Boltz's page: explicit empty overrides so her page doesn't
-- inherit Cristiane's retreats from the shared default block.
insert into public.page_block_overrides (url_inventory_id, variant_block_id, content)
select u.id, vb.id, '{"ao_person_id": ""}'::jsonb
from public.url_inventory u
join public.page_templates t on t.slug = 'single-retreat_leader'
join public.page_template_variants v on v.page_template_id = t.id and v.slug = 'default'
join public.page_template_variant_blocks vb on vb.page_template_variant_id = v.id
join public.blocks b on b.id = vb.block_id and b.slug in ('teacher_retreats_upcoming_default', 'teacher_retreats_past_default')
where u.url_path = '/retreat-leaders/angela-boltz/'
on conflict do nothing;
