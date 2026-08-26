-- ============================================================
-- 0067: Retreat Editorial fixes
--
-- 1. Hero photo no longer carries the overlaid title/subtitle text
--    (cleared line_1/line_2, overlay_opacity=0) -- the title now
--    sits in a plain heading block BELOW the photo instead.
-- 2. New retreat_title_wbn block: the title/subtitle, below the hero.
-- 3. New workshop_details_wbn block: the full description of both
--    workshops (these come from the scraped legacy page, not
--    AnamayOS -- the AO retreat_workshops table exists but has no
--    rows yet for this retreat, so there's nothing live to pull).
--
-- Idempotent.
-- ============================================================

update public.blocks set content = content - 'line_1' - 'line_2' - 'line_3' || '{"overlay_opacity":0}'::jsonb where slug = 'hero_overlay_wbn_a';

insert into public.blocks (slug, type_slug, name, content) values (
  'retreat_title_wbn', 'rich_text', 'Title — Wild by Nature', '{"html": "<h1 style=\"text-align:center\">Wild by Nature Retreat</h1><p style=\"text-align:center\">with Angela Boltz</p>", "padding_y_px": 32}'::jsonb
) on conflict (slug) do nothing;

insert into public.blocks (slug, type_slug, name, content) values (
  'workshop_details_wbn', 'rich_text', 'Workshop Details — Wild by Nature', '{"html": "<h3>The Creative Life: Finding Your Medium</h3><p><em>90-minute workshop &mdash; $50 single session / $100 for the full retreat</em></p><p>Many people carry a creative life they have not yet named \u2013 or one they have set aside without quite meaning to. This workshop explores creativity not as output, but as orientation: a quality of attention that belongs to you regardless of medium, skill, or time.</p><p>We work with magazine pages, natural materials gathered from the grounds, paper, and simple tools \u2013 building a collage around a single question: what does my creative life actually look like? We move from making into reflective conversation to help each person identify what their creative life looks like and what it would take to tend it the way they tend everything else they love.</p><p>There is no right answer and no artistic skill required \u2013 only the willingness to sit down, get present, and pay attention to what your heart and hand reach for.</p><p>What we explore:</p><ul><li>Creativity as a way of seeing, not just making</li><li>Identifying your natural creative medium or impulse</li><li>What gets in the way, and what it costs to keep waiting</li><li>A finished piece to take home</li></ul><h3>The Living Well Blueprint</h3><p><em>90-minute workshop &mdash; $75 single session / $100 for the full retreat</em></p><p>Over the course of this week you have moved, breathed, created, and listened. You have tracked sensation, followed beauty, and returned again and again to the question of what it means to truly inhabit your life.</p><p>This final workshop is where it all lands.</p><p>Together we return to the six domains we have been living inside all week \u2013 Season, Body, Rhythm, Beauty, Voice, Ritual \u2013 and we distill what we have discovered into something tangible and lasting. A single page. Your own personal map for this season of your life.</p><p>Not a to-do list. Not a set of resolutions. A living document that reflects who you actually are right now and how you want to move through your days\u2026 with intention, with artistry, with the particular kind of attention that makes a life feel genuinely, deeply yours.</p><p>You will leave with your blueprint in hand. A quiet, powerful reminder of everything you already know.</p>", "padding_y_px": 24}'::jsonb
) on conflict (slug) do nothing;

insert into public.page_template_variant_blocks (page_template_variant_id, block_id, sort_order, is_locked)
select v.id, b.id, o.sort_order, false
from public.page_template_variants v
join public.page_templates t on t.id = v.page_template_id and t.slug = 'retreat-editorial' and v.slug = 'default'
join (values
  ('retreat_title_wbn', 15),
  ('workshop_details_wbn', 45)
) as o(block_slug, sort_order) on true
join public.blocks b on b.slug = o.block_slug
on conflict do nothing;
