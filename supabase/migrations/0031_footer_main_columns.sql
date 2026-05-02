-- ============================================================
-- 0031: Restructure ui_footer_main into 4 columns matching legacy
--
-- 0030 seeded the main footer with a flat list of 4 link columns +
-- separate social_* and newsletter_* fields. The renderer turned
-- that into 6 grid cells, which wrapped to two rows on desktop —
-- not matching v2's exact 4-column layout where:
--   Column 1: Experience
--   Column 2: Travel + Cookbook (stacked)
--   Column 3: Company + Social (stacked)
--   Column 4: Newsletter
--
-- New shape: columns is an array of {groups: [...]} where each group
-- is either a links / social / newsletter group. This lets a single
-- column contain multiple stacked groups, mirroring v2 exactly.
-- ============================================================

update public.blocks
   set content = jsonb_build_object(
     'bg_color',      coalesce(content ->> 'bg_color', ''),
     'bg_opacity',    coalesce((content ->> 'bg_opacity')::numeric, 100),
     'heading_color', coalesce(content ->> 'heading_color', ''),
     'link_color',    coalesce(content ->> 'link_color', ''),
     'text_color',    coalesce(content ->> 'text_color', ''),
     'columns', jsonb_build_array(
       jsonb_build_object(
         'groups', jsonb_build_array(
           jsonb_build_object(
             'kind', 'links',
             'heading', 'The Experience',
             'items', jsonb_build_array(
               jsonb_build_object('label', 'Accommodations',         'href', '/accommodations/'),
               jsonb_build_object('label', 'Cuisine',                'href', '/cuisine'),
               jsonb_build_object('label', 'Map of Anamaya',         'href', '/property-map/'),
               jsonb_build_object('label', 'Pool',                   'href', '/infinity-pool/'),
               jsonb_build_object('label', 'Spa & Massages',         'href', '/spa-massage/'),
               jsonb_build_object('label', 'Waterfall & Trails Map', 'href', '/waterfall-and-trails-map/'),
               jsonb_build_object('label', 'Yoga Decks',             'href', '/photo-gallery/yoga-deck/'),
               jsonb_build_object('label', 'Bird Watching',          'href', '/costa-rica-birdwatching/')
             )
           )
         )
       ),
       jsonb_build_object(
         'groups', jsonb_build_array(
           jsonb_build_object(
             'kind', 'links',
             'heading', 'The Travel',
             'items', jsonb_build_array(
               jsonb_build_object('label', 'Travel & Directions',  'href', '/travel/'),
               jsonb_build_object('label', 'TripAdvisor Reviews',  'href', 'https://www.tripadvisor.com/Hotel_Review-g309278-d1593953-Reviews-Anamaya_Resort_Retreat_Center-Montezuma_Province_of_Puntarenas.html'),
               jsonb_build_object('label', 'Weather in Montezuma', 'href', '/montezuma-weather/')
             )
           ),
           jsonb_build_object(
             'kind', 'links',
             'heading', 'The Cookbook',
             'items', jsonb_build_array(
               jsonb_build_object('label', 'Cookbook Membership', 'href', '/cookbook-membership/'),
               jsonb_build_object('label', 'Cookbook Login',      'href', '/cookbook-membership-dashboard/')
             )
           )
         )
       ),
       jsonb_build_object(
         'groups', jsonb_build_array(
           jsonb_build_object(
             'kind', 'links',
             'heading', 'The Company',
             'items', jsonb_build_array(
               jsonb_build_object('label', 'Contact Us',               'href', '/contact/'),
               jsonb_build_object('label', 'Featured Blog & Articles', 'href', '/yoga-blog-articles/'),
               jsonb_build_object('label', 'Press Coverage',           'href', '/news-coverage-anamaya'),
               jsonb_build_object('label', 'Testimonials',             'href', '/testimonials/')
             )
           ),
           jsonb_build_object(
             'kind', 'social',
             'heading', 'On social',
             'links', jsonb_build_array(
               jsonb_build_object('label', 'Facebook',  'href', 'https://www.facebook.com/Anamayaresort'),
               jsonb_build_object('label', 'Twitter',   'href', 'https://twitter.com/anamayaresort'),
               jsonb_build_object('label', 'YouTube',   'href', 'https://www.youtube.com/channel/UC993Xg_jCeAy3UhoiAA9aTQ'),
               jsonb_build_object('label', 'Pinterest', 'href', 'https://www.pinterest.com/anamayaresort/'),
               jsonb_build_object('label', 'Instagram', 'href', 'https://www.instagram.com/anamayaresort/')
             )
           )
         )
       ),
       jsonb_build_object(
         'groups', jsonb_build_array(
           jsonb_build_object(
             'kind', 'newsletter',
             'heading', 'Receive our newsletter',
             'form_id', 'KStRA3wdDq5FUO6ah5Xe',
             'form_name', 'Newsletter Footer',
             'form_height', 380
           )
         )
       )
     )
   )
 where slug = 'ui_footer_main_default';
