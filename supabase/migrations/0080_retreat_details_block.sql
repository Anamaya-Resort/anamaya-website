-- ============================================================
-- 0080: "Retreat Details" slot on the Retreat — Editorial template.
--
-- The legacy pages carry a "RETREAT DETAILS" section holding what the
-- week includes, the daily programming, and the excursions list. It sits
-- on 112 of the 113 legacy retreat pages and was being dropped wholesale
-- on conversion, because nothing in the template held it (and the
-- extractor's `whats_included` came back empty on all 113 pages).
--
-- Slotted at sort_order 35: after the description, before the workshops.
-- Unlocked, so each page supplies its own content via page_block_overrides.
-- Idempotent.
-- ============================================================

insert into public.blocks (slug, type_slug, name, content)
values (
  'retreat_details_master',
  'rich_text',
  'Retreat Details (master)',
  '{"html": "", "padding_y_px": 40}'::jsonb
)
on conflict (slug) do update
  set type_slug = excluded.type_slug,
      name      = excluded.name;

insert into public.page_template_variant_blocks (page_template_variant_id, block_id, sort_order, is_locked)
select
  v.id,
  b.id,
  35,
  false
from public.page_template_variants v
join public.blocks b on b.slug = 'retreat_details_master'
where v.page_template_id = '2c89c7ed-da33-44b7-9455-1a97bf75b512'
  and v.is_default
  and not exists (
    select 1
    from public.page_template_variant_blocks x
    where x.page_template_variant_id = v.id
      and x.block_id = b.id
  );
