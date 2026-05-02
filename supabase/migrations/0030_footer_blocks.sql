-- ============================================================
-- 0030: Footer block types + seed content + site_footer template
--
-- Splits the legacy hardcoded Footer.tsx into two editable blocks:
--   - ui_footer_main : the dark multi-column block (links, social,
--     newsletter)
--   - ui_footer_legal : the light bottom strip with copyright +
--     terms / privacy / credit line
--
-- Both are NON-overlay blocks (they sit in normal document flow at
-- the bottom of the page), but are categorised under "ui" since
-- they're site chrome. They live in a new `site_footer` page_template
-- that AppShell renders below the main content on every public page,
-- mirroring how `site_chrome` already drives the header/menu/agent.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order)
values
  ('ui_footer_main',  'UI · Footer (Main)',
     'Dark multi-column site footer — link groups, social icons, embedded newsletter form. Renders below page content on every public page.',
     false, true, 5),
  ('ui_footer_legal', 'UI · Footer (Legal Strip)',
     'Light strip at the very bottom with copyright + terms / privacy / credit line. Body is rich-text HTML; the literal {year} token is replaced with the current year at render time.',
     false, true, 6)
on conflict (slug) do update
  set name        = excluded.name,
      description = excluded.description,
      is_overlay  = excluded.is_overlay,
      is_active   = excluded.is_active,
      sort_order  = excluded.sort_order;

-- ── Seed: main footer ─────────────────────────────────────────────
-- Content mirrors data/nav.ts FOOTER_LAYOUT + SOCIAL_LINKS so the
-- live site looks identical to the legacy hardcoded Footer.tsx.

insert into public.blocks (id, type_slug, slug, name, content)
values (
  '33333333-3333-3333-3333-333333333331',
  'ui_footer_main',
  'ui_footer_main_default',
  'Site Footer — Main (Default)',
  jsonb_build_object(
    'bg_color',       '',
    'bg_opacity',     100,
    'heading_color',  '',
    'link_color',     '',
    'text_color',     '',
    'columns', jsonb_build_array(
      jsonb_build_object(
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
      ),
      jsonb_build_object(
        'heading', 'The Travel',
        'items', jsonb_build_array(
          jsonb_build_object('label', 'Travel & Directions',  'href', '/travel/'),
          jsonb_build_object('label', 'TripAdvisor Reviews',  'href', 'https://www.tripadvisor.com/Hotel_Review-g309278-d1593953-Reviews-Anamaya_Resort_Retreat_Center-Montezuma_Province_of_Puntarenas.html'),
          jsonb_build_object('label', 'Weather in Montezuma', 'href', '/montezuma-weather/')
        )
      ),
      jsonb_build_object(
        'heading', 'The Cookbook',
        'items', jsonb_build_array(
          jsonb_build_object('label', 'Cookbook Membership', 'href', '/cookbook-membership/'),
          jsonb_build_object('label', 'Cookbook Login',      'href', '/cookbook-membership-dashboard/')
        )
      ),
      jsonb_build_object(
        'heading', 'The Company',
        'items', jsonb_build_array(
          jsonb_build_object('label', 'Contact Us',               'href', '/contact/'),
          jsonb_build_object('label', 'Featured Blog & Articles', 'href', '/yoga-blog-articles/'),
          jsonb_build_object('label', 'Press Coverage',           'href', '/news-coverage-anamaya'),
          jsonb_build_object('label', 'Testimonials',             'href', '/testimonials/')
        )
      )
    ),
    'social_heading', 'On social',
    'social_links', jsonb_build_array(
      jsonb_build_object('label', 'Facebook',  'href', 'https://www.facebook.com/Anamayaresort'),
      jsonb_build_object('label', 'Twitter',   'href', 'https://twitter.com/anamayaresort'),
      jsonb_build_object('label', 'YouTube',   'href', 'https://www.youtube.com/channel/UC993Xg_jCeAy3UhoiAA9aTQ'),
      jsonb_build_object('label', 'Pinterest', 'href', 'https://www.pinterest.com/anamayaresort/'),
      jsonb_build_object('label', 'Instagram', 'href', 'https://www.instagram.com/anamayaresort/')
    ),
    'newsletter_heading',     'Receive our newsletter',
    'newsletter_form_id',     'KStRA3wdDq5FUO6ah5Xe',
    'newsletter_form_name',   'Newsletter Footer',
    'newsletter_form_height', 380
  )
)
on conflict (slug) do nothing;

-- ── Seed: legal strip ─────────────────────────────────────────────

insert into public.blocks (id, type_slug, slug, name, content)
values (
  '33333333-3333-3333-3333-333333333332',
  'ui_footer_legal',
  'ui_footer_legal_default',
  'Site Footer — Legal Strip (Default)',
  jsonb_build_object(
    'bg_color',     '',
    'text_color',   '',
    'align',        'center',
    'padding_y_px', 16,
    'font_size_px', 12,
    'body_html',
'<p>Copyright © {year} Anamaya Resort and Retreat Center | All Rights Reserved.</p>
<p><a href="/terms-service-anamaya-website/">Terms of Use</a> | <a href="/terms-service-anamaya-website/">Privacy Policy</a> | Site designed by <a href="https://justbucreative.com/" target="_blank" rel="noopener">JUSTBU Creative, LLC | Laurie Baines</a></p>'
  )
)
on conflict (slug) do nothing;

-- ── site_footer template ──────────────────────────────────────────

insert into public.page_templates (slug, name)
values ('site_footer', 'Site Footer (Main + Legal Strip)')
on conflict (slug) do nothing;

insert into public.page_template_variants (page_template_id, slug, name, is_default)
select id, 'site_footer_default', 'Default', true
  from public.page_templates where slug = 'site_footer'
on conflict (page_template_id, slug) do nothing;

insert into public.page_template_variant_blocks (page_template_variant_id, block_id, sort_order, is_locked)
select v.id, b.id, 10, true
  from public.page_template_variants v
  join public.blocks b on b.slug = 'ui_footer_main_default'
 where v.slug = 'site_footer_default'
   and not exists (
     select 1 from public.page_template_variant_blocks x
      where x.page_template_variant_id = v.id and x.block_id = b.id
   );

insert into public.page_template_variant_blocks (page_template_variant_id, block_id, sort_order, is_locked)
select v.id, b.id, 20, true
  from public.page_template_variants v
  join public.blocks b on b.slug = 'ui_footer_legal_default'
 where v.slug = 'site_footer_default'
   and not exists (
     select 1 from public.page_template_variant_blocks x
      where x.page_template_variant_id = v.id and x.block_id = b.id
   );
