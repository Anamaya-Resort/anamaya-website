-- ============================================================
-- 0027: Backfill the seed UI overlay blocks with real content
--
-- 0025 seeded ui_top_default + ui_side_menu_right_default with
-- minimal placeholder content. Now that the editors expose the
-- meaningful fields, copy the live values from data/nav.ts into
-- the block content so:
--   - the top bar carries the actual logos / CTA / menu label
--     (already correct from 0025; this migration leaves it),
--   - the side menu carries the full SIDE_MENU items tree
--     instead of pulling from the data file.
--
-- The renderer falls back to the data-file constant when the
-- block has no items, so this is non-breaking even if the
-- migration is applied out of order.
-- ============================================================

update public.blocks
   set content = content
     - 'use_nav_data'
     || jsonb_build_object(
       'items', jsonb_build_array(
         jsonb_build_object('label', 'Calendar', 'href', '/rg-calendar/'),
         jsonb_build_object('label', 'Home',     'href', '/'),
         jsonb_build_object(
           'label', 'Yoga Retreats',
           'children', jsonb_build_array(
             jsonb_build_object('label', 'Retreat Rates',    'href', '/rates-new/'),
             jsonb_build_object('label', 'Retreat Types',    'href', '/retreats/'),
             jsonb_build_object('label', 'FAQs',             'href', '/faqs-page/'),
             jsonb_build_object('label', 'Special Retreats', 'href', '/special-retreats/')
           )
         ),
         jsonb_build_object(
           'label', 'Yoga Teacher Training',
           'children', jsonb_build_array(
             jsonb_build_object('label', 'YTT Info & Rates', 'href', '/rates-yoga-teacher-training/'),
             jsonb_build_object('label', 'YTT Calendar',     'href', '/calendar-yoga-teacher-training/'),
             jsonb_build_object('label', 'YTT FAQs',         'href', '/faqs-for-ytts/')
           )
         ),
         jsonb_build_object('label', 'Spa – Massage & Beauty', 'href', '/spa-massage-costa-rica/'),
         jsonb_build_object(
           'label', 'About Us',
           'children', jsonb_build_array(
             jsonb_build_object('label', 'Accommodations',         'href', '/accommodations/'),
             jsonb_build_object('label', 'Traveling To Anamaya',   'href', '/travel/'),
             jsonb_build_object('label', 'Photo Galleries',        'href', '/photo-galleries/'),
             jsonb_build_object('label', 'On the Blog',            'href', '/yoga-blog-articles/'),
             jsonb_build_object('label', 'Scuba Certification',    'href', '/scuba-certification-anamaya-resort/'),
             jsonb_build_object('label', 'Testimonials',           'href', '/guest_testimonials/'),
             jsonb_build_object('label', 'Press',                  'href', '/news-coverage-anamaya/'),
             jsonb_build_object('label', 'Contact Us',             'href', '/contact/'),
             jsonb_build_object('label', 'Host your own Retreat',  'href', '/host-your-own-retreat-at-anamaya/')
           )
         ),
         jsonb_build_object(
           'label', 'Shop',
           'children', jsonb_build_array(
             jsonb_build_object('label', 'Anamaya Gift Certificates', 'href', '/anamaya-gift-certificates/'),
             jsonb_build_object('label', 'Cookbook Membership',       'href', '/cookbook-membership/'),
             jsonb_build_object(
               'label', 'Intuitive Marketing Membership (for yoga teachers)',
               'href', 'https://www.kelseymatheson.com/wellness-entrepreneur-mastermind'
             )
           )
         )
       )
     )
 where slug = 'ui_side_menu_right_default';
