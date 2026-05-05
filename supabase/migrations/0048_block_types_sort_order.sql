-- Pin block_types.sort_order so the /admin/blocks list groups types
-- in the order editors actually use them:
--
--   1.  Three UI overlays at the very top
--          ui_top, ui_side_menu_right, ui_agent
--   2.  Two heroes next
--          image_slideshow ("Hero with Slideshow"), hero ("Hero with Video")
--   3.  Everything else in the middle, alphabetised by name
--   4.  Two footer blocks at the very bottom
--          ui_footer_main, ui_footer_legal
--
-- The /admin/blocks page already orders by (sort_order, name), so as
-- long as middle blocks share the default sort_order=100 they'll fall
-- out alphabetically with no per-block tweaks.

-- Reset everything to the middle bucket first, then carve out the
-- bands above and below.
update public.block_types set sort_order = 100;

-- Top UI overlays.
update public.block_types set sort_order = 1   where slug = 'ui_top';
update public.block_types set sort_order = 2   where slug = 'ui_side_menu_right';
update public.block_types set sort_order = 3   where slug = 'ui_agent';

-- Two heroes (slideshow before video, matching the /admin/blocks/new
-- and editor menus).
update public.block_types set sort_order = 10  where slug = 'image_slideshow';
update public.block_types set sort_order = 11  where slug = 'hero';

-- Footers at the bottom of the list.
update public.block_types set sort_order = 900 where slug = 'ui_footer_main';
update public.block_types set sort_order = 910 where slug = 'ui_footer_legal';
