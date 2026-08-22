-- ============================================================
-- 0066: Two retreat template designs (Editorial + Resort Card)
--
-- Both are two-column templates (layout='two_col', aside_position='left')
-- with the teacher card(s) in the left aside and everything else in the
-- main column, per the reference page style
-- (anamaya.com/retreat/wild-by-nature-retreat-costa-rica-angela-boltz/).
-- Populated end-to-end with real content for the Wild by Nature retreat
-- (blocks from 0064/0065) so both preview with real data.
--
-- Idempotent.
-- ============================================================

insert into public.page_templates (slug, name)
values
  ('retreat-editorial', 'Retreat — Editorial'),
  ('retreat-resort-card', 'Retreat — Resort Card')
on conflict (slug) do nothing;

insert into public.page_template_variants (page_template_id, slug, name, is_default, layout, aside_position)
select id, 'default', 'Default', true, 'two_col', 'left'
from public.page_templates
where slug = 'retreat-editorial'
on conflict do nothing;

insert into public.page_template_variants (page_template_id, slug, name, is_default, layout, aside_position)
select id, 'default', 'Default', true, 'two_col', 'left'
from public.page_templates
where slug = 'retreat-resort-card'
on conflict do nothing;

-- Design A — Editorial
insert into public.page_template_variant_blocks (page_template_variant_id, block_id, sort_order, is_locked)
select v.id, b.id, o.sort_order, false
from public.page_template_variants v
join public.page_templates t on t.id = v.page_template_id and t.slug = 'retreat-editorial' and v.slug = 'default'
join (values
  ('hero_overlay_wbn_a', 10),
  ('retreat_rates_wbn', 20),
  ('rich_text_wbn_desc', 30),
  ('pricing_table_wbn_workshops', 40),
  ('gallery_wbn_a', 50),
  ('retreat_leader_wbn_angela', 60)
) as o(block_slug, sort_order) on true
join public.blocks b on b.slug = o.block_slug
on conflict do nothing;

-- Design B — Resort Card
insert into public.page_template_variant_blocks (page_template_variant_id, block_id, sort_order, is_locked)
select v.id, b.id, o.sort_order, false
from public.page_template_variants v
join public.page_templates t on t.id = v.page_template_id and t.slug = 'retreat-resort-card' and v.slug = 'default'
join (values
  ('hero_overlay_wbn_b', 10),
  ('retreat_rates_wbn', 20),
  ('image_text_wbn_story', 30),
  ('checklist_wbn_domains', 40),
  ('gallery_wbn_b', 50),
  ('cta_banner_wbn', 60),
  ('retreat_leader_wbn_angela', 70)
) as o(block_slug, sort_order) on true
join public.blocks b on b.slug = o.block_slug
on conflict do nothing;
