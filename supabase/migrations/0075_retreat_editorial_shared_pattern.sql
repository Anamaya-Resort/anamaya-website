-- ============================================================
-- 0075: Restructure Retreat Editorial to the shared-block +
-- per-page-override pattern (same fix just applied to the
-- retreat leader template)
--
-- Until now these 8 blocks carried Wild by Nature's real content
-- directly -- fine for one demo page, but pointing more retreats
-- at this same template would have leaked Angela Boltz's content
-- onto every one of them (the exact bug just fixed for teacher
-- pages). This migration:
--   1. Renames the 8 blocks to *_master (clearer now that they're
--      shared, not Wild-by-Nature-specific).
--   2. Copies their CURRENT (Angela-specific) content into a
--      page_block_override set on Wild by Nature's own real legacy
--      page, and assigns that page the template -- retreat
--      conversion #1.
--   3. Replaces the masters' own content with generic placeholder
--      content (not any real retreat's data), so the admin
--      template editor still previews something real-looking, and
--      so a future page that forgets to override a block shows an
--      obvious placeholder instead of a different retreat's data.
--   4. Adds a second (empty-by-default) leader slot for co-taught
--      retreats -- renders nothing when unused.
--
-- Idempotent for the renames/placeholders; the override insert and
-- cms_template_id update use WHERE/ON CONFLICT guards.
-- ============================================================

insert into public.page_block_overrides (url_inventory_id, variant_block_id, content)
values ('64f23082-a9a9-40d0-9619-85dcf9df650d', '144dbbd6-df8a-4bfe-9445-fa8abdc04278', '{"align": "center", "height_px": 560, "image_alt": "Wild by Nature Retreat at Anamaya", "image_fit": "cover", "image_url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/64f23082-a9a9-40d0-9619-85dcf9df650d/gallery/hero-image-83-6bb3879c.png", "overlay_opacity": 0, "corner_radius_px": 8}'::jsonb)
on conflict do nothing;

insert into public.page_block_overrides (url_inventory_id, variant_block_id, content)
values ('64f23082-a9a9-40d0-9619-85dcf9df650d', 'ea266e9c-2980-454b-b1a1-8eab474c3a77', '{"html": "<h1 style=\"text-align:center\">Wild by Nature Retreat</h1><p style=\"text-align:center\">with Angela Boltz</p>", "padding_y_px": 32}'::jsonb)
on conflict do nothing;

insert into public.page_block_overrides (url_inventory_id, variant_block_id, content)
values ('64f23082-a9a9-40d0-9619-85dcf9df650d', 'ca30fa78-411b-434c-acfa-0996a9a70fcf', '{"heading": "Dates & Rates", "retreat_id": "5eb0a8e8-2467-4432-91d6-722101907c82", "manual_tiers": [{"name": "Dorm", "price": "$1,095"}, {"name": "Triple", "price": "$1,295"}, {"name": "Double", "price": "$1,595"}, {"name": "Single", "price": "$2,195"}], "padding_y_px": 32, "manual_cta_href": "https://anamaya.secure.retreat.guru/program/wild-by-nature-yoga-retreat-angela-boltz/?form=1&lang=en", "manual_cta_label": "Book Now", "manual_dates_text": "Sept 12 \u2013 19, 2026", "manual_spots_text": "", "container_width_px": 1200}'::jsonb)
on conflict do nothing;

insert into public.page_block_overrides (url_inventory_id, variant_block_id, content)
values ('64f23082-a9a9-40d0-9619-85dcf9df650d', 'c229572b-1c0d-446e-8c7c-f05b2852bb92', '{"html": "<p><strong>Wild by Nature. Refined by Design.</strong></p><p>Learn the Art of Truly Living \u2013 a jungle retreat at Anamaya, named one of National Geographic\u2019s Best Wellness Destinations for 2026.</p><p>This retreat is where you\u2019ll wake to howler monkeys, move through optional yoga classes and workshops on an open-air deck, and rediscover what it means to be fully awake inside your own life.</p><p>Each day opens a new doorway: body, rhythm, beauty, voice, ritual. You\u2019ll leave with your own Living Well Blueprint and something harder to name \u2013 a felt sense of how to savor the life already waiting for you.</p><p><strong>Spots are Limited. Reserve yours today.</strong></p>", "padding_y_px": 48}'::jsonb)
on conflict do nothing;

insert into public.page_block_overrides (url_inventory_id, variant_block_id, content)
values ('64f23082-a9a9-40d0-9619-85dcf9df650d', '403e929f-18cd-4fde-a6e1-685237575195', '{"intro": "Add-on sessions during your stay (space is limited, priced separately from the retreat).", "tiers": [{"name": "The Creative Life: Finding Your Medium", "note": "90-minute workshop", "price": "$50\u2013$100"}, {"name": "The Living Well Blueprint", "note": "90-minute workshop", "price": "$75\u2013$100"}], "heading": "Optional Workshops", "padding_y_px": 32}'::jsonb)
on conflict do nothing;

insert into public.page_block_overrides (url_inventory_id, variant_block_id, content)
values ('64f23082-a9a9-40d0-9619-85dcf9df650d', 'aa9b32a9-9236-45b4-b6ea-4b386021a0d4', '{"html": "<h3>The Creative Life: Finding Your Medium</h3><p><em>90-minute workshop &mdash; $50 single session / $100 for the full retreat</em></p><p>Many people carry a creative life they have not yet named \u2013 or one they have set aside without quite meaning to. This workshop explores creativity not as output, but as orientation: a quality of attention that belongs to you regardless of medium, skill, or time.</p><p>We work with magazine pages, natural materials gathered from the grounds, paper, and simple tools \u2013 building a collage around a single question: what does my creative life actually look like? We move from making into reflective conversation to help each person identify what their creative life looks like and what it would take to tend it the way they tend everything else they love.</p><p>There is no right answer and no artistic skill required \u2013 only the willingness to sit down, get present, and pay attention to what your heart and hand reach for.</p><p>What we explore:</p><ul><li>Creativity as a way of seeing, not just making</li><li>Identifying your natural creative medium or impulse</li><li>What gets in the way, and what it costs to keep waiting</li><li>A finished piece to take home</li></ul><h3>The Living Well Blueprint</h3><p><em>90-minute workshop &mdash; $75 single session / $100 for the full retreat</em></p><p>Over the course of this week you have moved, breathed, created, and listened. You have tracked sensation, followed beauty, and returned again and again to the question of what it means to truly inhabit your life.</p><p>This final workshop is where it all lands.</p><p>Together we return to the six domains we have been living inside all week \u2013 Season, Body, Rhythm, Beauty, Voice, Ritual \u2013 and we distill what we have discovered into something tangible and lasting. A single page. Your own personal map for this season of your life.</p><p>Not a to-do list. Not a set of resolutions. A living document that reflects who you actually are right now and how you want to move through your days\u2026 with intention, with artistry, with the particular kind of attention that makes a life feel genuinely, deeply yours.</p><p>You will leave with your blueprint in hand. A quiet, powerful reminder of everything you already know.</p>", "padding_y_px": 24}'::jsonb)
on conflict do nothing;

insert into public.page_block_overrides (url_inventory_id, variant_block_id, content)
values ('64f23082-a9a9-40d0-9619-85dcf9df650d', 'd384555b-4b04-4acc-8826-de4825a1ec0e', '{"images": [{"alt": "Wild by Nature retreat at Anamaya", "url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/64f23082-a9a9-40d0-9619-85dcf9df650d/gallery/hero-image-83-6bb3879c.png"}, {"alt": "Wild by Nature retreat at Anamaya", "url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/ee6afaac-3f31-42b9-a5d4-feea52aa96e4/gallery/lower-deck-yoga-class-cropped-300x300-51700eee.png"}, {"alt": "Wild by Nature retreat at Anamaya", "url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/027a4a94-a39f-4421-9338-878953d743db/gallery/relax-on-the-pool-deck-at-anamaya-resort-300x300-87bae3ad.jpg"}, {"alt": "Wild by Nature retreat at Anamaya", "url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/027a4a94-a39f-4421-9338-878953d743db/gallery/spa-1-300x300-c701562a.jpg"}, {"alt": "Wild by Nature retreat at Anamaya", "url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/027a4a94-a39f-4421-9338-878953d743db/gallery/cristiane-link-300x300-c44147a2.jpg"}, {"alt": "Wild by Nature retreat at Anamaya", "url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/027a4a94-a39f-4421-9338-878953d743db/gallery/food-5-300x300-342b7e50.jpg"}], "layout": "grid", "columns": 3, "lightbox": true, "padding_y_px": 32}'::jsonb)
on conflict do nothing;

insert into public.page_block_overrides (url_inventory_id, variant_block_id, content)
values ('64f23082-a9a9-40d0-9619-85dcf9df650d', '45734b4c-b726-4800-ad19-2ea272bddb69', '{"name": "Angela Boltz", "role": "Lead Teacher", "bio_html": "<p><strong>Angela Boltz</strong> is an internationally recognized yoga and meditation teacher whose work opens a door for women to develop intimacy with their lives, grounding into a deep, unwavering trust in their own capacity for direct knowing.</p><p>Born from 20+ years as a women\u2019s holistic wellness educator, her teaching is an integrative, feminine approach to well-being: a rich fusion of traditional wisdom, deep rest, and self-inquiry. She spent years living in Costa Rica and traveling the world as a teacher\u2019s teacher, and is also a writer, artist, and ceremonialist.</p><p>Her methodology, <strong>Embodied Rewilding\u2122</strong>, weaves yoga, tantra, mindfulness, ecosomatics, and flow psychology into a path for women to reset their inner compass, align with the rhythm of nature, and move through life with sensual fullness and true belonging.</p><p>A Yoga Alliance accredited teacher since 2003 and teacher trainer since 2008, Angela has directed twelve major training programs across the U.S., Costa Rica, Nicaragua, and Panama, and co-produced the Montezuma Gathering music and wellness festival in 2011. Her teaching draws from 25+ years on her mat, a devoted meditation practice, and a degree in Cultural Anthropology focused on Comparative Eastern Religions.</p>", "link_href": "/retreat-leaders/angela-boltz/", "photo_url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/64f23082-a9a9-40d0-9619-85dcf9df650d/gallery/angela-boltz-31b825b6.jpg", "link_label": "", "responsive_mode": "fixed"}'::jsonb)
on conflict do nothing;

update public.blocks set slug = 'retreat_hero_master', content = '{"image_url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/64f23082-a9a9-40d0-9619-85dcf9df650d/gallery/hero-image-83-6bb3879c.png", "image_alt": "Anamaya Resort", "image_fit": "cover", "height_px": 560, "overlay_opacity": 0, "align": "center", "corner_radius_px": 8}'::jsonb where slug = 'hero_overlay_wbn_a';

update public.blocks set slug = 'retreat_title_master', content = '{"html": "<h1 style=\"text-align:center\">Retreat Name</h1><p style=\"text-align:center\">with Retreat Leader</p>", "padding_y_px": 32}'::jsonb where slug = 'retreat_title_wbn';

update public.blocks set slug = 'retreat_rates_master', content = '{"heading": "Dates & Rates", "manual_dates_text": "Dates TBD", "manual_tiers": [{"name": "Sample Room", "price": "$1,595"}], "manual_cta_label": "Book Now", "manual_cta_href": "#"}'::jsonb where slug = 'retreat_rates_wbn';

update public.blocks set slug = 'retreat_description_master', content = '{"html": "<p>This is placeholder text showing where the retreat''s description appears. Each retreat''s real page overrides this block with its own content.</p>", "padding_y_px": 48}'::jsonb where slug = 'rich_text_wbn_desc';

update public.blocks set slug = 'retreat_workshops_pricing_master', content = '{"heading": "Optional Workshops", "intro": "", "tiers": [], "padding_y_px": 32}'::jsonb where slug = 'pricing_table_wbn_workshops';

update public.blocks set slug = 'retreat_workshops_details_master', content = '{"html": "", "padding_y_px": 24}'::jsonb where slug = 'workshop_details_wbn';

update public.blocks set slug = 'retreat_gallery_master', content = '{"images": [], "layout": "grid", "columns": 3, "lightbox": true, "padding_y_px": 32}'::jsonb where slug = 'gallery_wbn_a';

update public.blocks set slug = 'retreat_leader_master_1', content = '{"responsive_mode": "fixed", "role": "Lead Teacher", "name": "Retreat Leader", "bio_html": "<p>This is placeholder text showing where the retreat leader''s bio appears.</p>"}'::jsonb where slug = 'retreat_leader_wbn_angela';

insert into public.blocks (slug, type_slug, name, content)
values ('retreat_leader_master_2', 'retreat_leader', 'Retreat Leader (co-teacher slot)', '{}'::jsonb)
on conflict (slug) do nothing;

insert into public.page_template_variant_blocks (page_template_variant_id, block_id, sort_order, is_locked)
select 'f61430b9-1c4a-4766-a351-0467fd9c569c', b.id, 65, false
from public.blocks b where b.slug = 'retreat_leader_master_2'
on conflict do nothing;

update public.url_inventory
set cms_template_id = '2c89c7ed-da33-44b7-9455-1a97bf75b512'
where id = '64f23082-a9a9-40d0-9619-85dcf9df650d';
