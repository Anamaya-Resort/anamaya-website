-- ============================================================
-- 0078: Convert the retreat title slot to the new retreat_title block
--
-- Was a plain rich_text block with a hand-written "<h1>Name</h1><p>with
-- Leader</p>" -- replaced with the dedicated retreat_title block (name +
-- live status line). Reuses the SAME block row (id unchanged, so the
-- template's variant_block linkage doesn't need to move) and rewrites
-- its type_slug + content, then rewrites the 5 already-converted
-- retreats' per-page overrides to the new {retreat_id, manual_title}
-- shape. The "with Leader" line is dropped -- the leader is already
-- named on their card in the side column.
--
-- Idempotent.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order, shape)
values
  ('retreat_title', 'Retreat Title',
     'Retreat name + a live status line computed from AnamayOS (Currently in Progress / Retreat Has Ended / Retreat Is Full / nothing when bookable).',
     false, true, 41, 'horizontal')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      is_overlay = excluded.is_overlay,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order,
      shape = excluded.shape;

update public.blocks
set type_slug = 'retreat_title',
    content = '{"manual_title": "Retreat Name"}'::jsonb
where slug = 'retreat_title_master';

-- Wild by Nature (Angela Boltz)
update public.page_block_overrides
set content = '{"retreat_id": "5eb0a8e8-2467-4432-91d6-722101907c82", "manual_title": "Wild by Nature Retreat"}'::jsonb
where url_inventory_id = '64f23082-a9a9-40d0-9619-85dcf9df650d'
  and variant_block_id = 'ea266e9c-2980-454b-b1a1-8eab474c3a77';

-- Regulate (Colynn Cespedes)
update public.page_block_overrides
set content = '{"retreat_id": "0f61bab5-bdea-46e7-8953-2dfa3db35cc6", "manual_title": "Regulate: A Somatic Experiencing Retreat – Colynn Cespedes"}'::jsonb
where url_inventory_id = '200ea630-644d-4ae8-9e16-d2d008ff4d59'
  and variant_block_id = 'ea266e9c-2980-454b-b1a1-8eab474c3a77';

-- The Art of Thriving (Leslie Lutsch & Colleen Navas) -- both v1+v2 rows
update public.page_block_overrides
set content = '{"retreat_id": "495ea078-5a61-4ddf-806b-6bb6936202d3", "manual_title": "The Art of Thriving – Leslie Lutsch & Colleen Navas"}'::jsonb
where url_inventory_id in ('027a4a94-a39f-4421-9338-878953d743db', 'd94f2f3e-b65a-4f8e-9fb4-bf7ef0ab4fc5')
  and variant_block_id = 'ea266e9c-2980-454b-b1a1-8eab474c3a77';

-- The Anatomy of Sacred Breath (Cristiane Machado) -- both v1+v2 rows
update public.page_block_overrides
set content = '{"retreat_id": "61c60017-8ba9-485f-8a7f-7a5b92666466", "manual_title": "The Anatomy of Sacred Breath – Cristiane Machado"}'::jsonb
where url_inventory_id in ('d0022fca-e2ae-4c01-9f11-76f36b0e122b', 'd6e8e73e-71a9-4e07-89c1-802d892b4954')
  and variant_block_id = 'ea266e9c-2980-454b-b1a1-8eab474c3a77';

-- Awaken Your Path (Missy & David Hartley)
update public.page_block_overrides
set content = '{"retreat_id": "2553f262-0112-4591-aace-a080083bd3d7", "manual_title": "Awaken Your Path – Missy & David Hartley"}'::jsonb
where url_inventory_id = 'a19ea53e-8606-4dfd-a9f2-8cce7c4c3b34'
  and variant_block_id = 'ea266e9c-2980-454b-b1a1-8eab474c3a77';
