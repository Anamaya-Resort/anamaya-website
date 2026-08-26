-- ============================================================
-- 0069: Teacher Profile block + single-yoga_teacher template
--
-- One shared block + template, reused across every teacher page -- each
-- page's actual name/photo/bio is a per-page override
-- (page_block_overrides), same mechanism already used elsewhere for
-- pages that share one template. Prefers live AnamayOS (ao_person_id)
-- when set; otherwise the page's override content.
--
-- Seeds one real teacher page (Angela Boltz, /yoga-teachers/angela-boltz/)
-- using her actual bio already scraped from the legacy site, so the
-- Retreat Leader block's name can link somewhere real today. AnamayOS
-- doesn't have a persons/retreat_leader_profiles row for her yet -- once
-- teachers self-register there, filling in this page's ao_person_id
-- switches it to live data with no other change needed.
--
-- Idempotent.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order, shape)
values
  ('teacher_profile', 'Teacher Profile',
     'Main block of the single-yoga_teacher template. One shared instance across all teacher pages -- each page overrides it with that teacher''s own name/photo/bio. Live from AnamayOS when linked, else the page''s override content.',
     false, true, 43, 'horizontal')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      is_overlay = excluded.is_overlay,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order,
      shape = excluded.shape;

insert into public.blocks (slug, type_slug, name, content)
values ('teacher_profile_default', 'teacher_profile', 'Teacher Profile', '{}'::jsonb)
on conflict (slug) do nothing;

insert into public.page_templates (slug, name)
values ('single-yoga_teacher', 'Yoga Teacher Profile')
on conflict (slug) do nothing;

insert into public.page_template_variants (page_template_id, slug, name, is_default, layout, aside_position)
select id, 'default', 'Default', true, 'one_col', 'right'
from public.page_templates
where slug = 'single-yoga_teacher'
on conflict do nothing;

insert into public.page_template_variant_blocks (page_template_variant_id, block_id, sort_order, is_locked)
select v.id, b.id, 10, false
from public.page_template_variants v
join public.page_templates t on t.id = v.page_template_id and t.slug = 'single-yoga_teacher' and v.slug = 'default'
join public.blocks b on b.slug = 'teacher_profile_default'
on conflict do nothing;

-- Angela Boltz's real teacher page.
insert into public.url_inventory (source_site, url, url_path, url_kind, post_type, title, wp_status, cms_template_id)
select 'v2', 'https://anamaya.com/yoga-teachers/angela-boltz/', '/yoga-teachers/angela-boltz/', 'content', 'yoga_teacher', 'Angela Boltz', 'publish', t.id
from public.page_templates t
where t.slug = 'single-yoga_teacher'
on conflict do nothing;

insert into public.page_block_overrides (url_inventory_id, variant_block_id, content)
select u.id, vb.id, '{"name": "Angela Boltz", "credentials": "Yoga Alliance accredited teacher since 2003 \u00b7 Teacher trainer since 2008", "photo_url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/64f23082-a9a9-40d0-9619-85dcf9df650d/gallery/angela-boltz-31b825b6.jpg", "bio_html": "<p><strong>Angela Boltz</strong> is an internationally recognized yoga and meditation teacher whose work opens a door for women to develop intimacy with their lives, grounding into a deep, unwavering trust in their own capacity for direct knowing.</p><p>Born from 20+ years as a women\u2019s holistic wellness educator, her teaching is an integrative, feminine approach to well-being: a rich fusion of traditional wisdom, deep rest, and self-inquiry. She spent years living in Costa Rica and traveling the world as a teacher\u2019s teacher, and is also a writer, artist, and ceremonialist.</p><p>Her methodology, <strong>Embodied Rewilding\u2122</strong>, weaves yoga, tantra, mindfulness, ecosomatics, and flow psychology into a path for women to reset their inner compass, align with the rhythm of nature, and move through life with sensual fullness and true belonging.</p><p>A Yoga Alliance accredited teacher since 2003 and teacher trainer since 2008, Angela has directed twelve major training programs across the U.S., Costa Rica, Nicaragua, and Panama, and co-produced the Montezuma Gathering music and wellness festival in 2011. Her teaching draws from 25+ years on her mat, a devoted meditation practice, and a degree in Cultural Anthropology focused on Comparative Eastern Religions.</p>", "specialties": ["Embodied Rewilding\u2122", "Meditation", "Teacher Training"]}'::jsonb
from public.url_inventory u
join public.page_templates t on t.slug = 'single-yoga_teacher'
join public.page_template_variants v on v.page_template_id = t.id and v.slug = 'default'
join public.page_template_variant_blocks vb on vb.page_template_variant_id = v.id
join public.blocks b on b.id = vb.block_id and b.slug = 'teacher_profile_default'
where u.url_path = '/yoga-teachers/angela-boltz/'
on conflict do nothing;

-- Make the Retreat Leader card's name link to her new page.
update public.blocks
set content = content || '{"link_href": "/yoga-teachers/angela-boltz/"}'::jsonb
where slug = 'retreat_leader_wbn_angela';
