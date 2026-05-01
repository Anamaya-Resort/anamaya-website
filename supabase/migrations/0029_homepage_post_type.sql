-- ============================================================
-- 0029: Homepage post type
--
-- Reclassifies the single existing "/" inventory row from
-- post_type='page' to 'homepage'. The migrated WP homepage was
-- imported as just another page; promoting it to its own post
-- type lets the admin manage it separately, and lets future
-- split-testing variants of the homepage live alongside it
-- without polluting the regular Pages list.
--
-- Rendering still falls back to today's static markup until
-- cms_template_id is set on the homepage row (the catch-all
-- router and the rewritten / route both honour that field).
--
-- The 'home' page_template was seeded in 0013 with hero_vid_1 +
-- press_bar_1; it stays available unchanged. Admins can wire it
-- up by setting the / row's cms_template_id via the Edit screen.
-- ============================================================

update public.url_inventory
   set post_type = 'homepage'
 where url_path = '/'
   and post_type = 'page'
   and source_site = 'v2';
