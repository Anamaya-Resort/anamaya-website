-- ============================================================
-- 0025: UI overlay block types (top bar, slide-out menu, AI agent)
--
-- Until now Header.tsx and SideMenu.tsx have been hard-coded into
-- AppShell. This migration turns them into reusable block types so
-- they can:
--   - render through the same template/Shortcode pipeline as every
--     other block,
--   - be swapped/duplicated/edited per template (e.g. a homepage
--     variant with no top bar, just a video),
--   - be previewed in isolation in the block editor.
--
-- "Overlay" is the new generic concept: any block_type whose
-- is_overlay = true is fixed-position chrome (drawn on top,
-- transparent canvas in the editor, gutter controls visible).
-- Anchor / z / trigger live *per instance* in blocks.content JSONB
-- so a single template can carry two ui_top variants with
-- different anchors. Future overlay-style blocks (cookie banner,
-- promo strip) reuse the same flag.
--
-- ui_agent is seeded but inactive — placeholder for the future AI
-- chat bubble.
-- ============================================================

alter table public.block_types
  add column if not exists is_overlay boolean          not null default false,
  add column if not exists is_active  boolean          not null default true,
  add column if not exists sort_order double precision not null default 100;

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order)
values
  ('ui_top',             'UI · Top Bar',
     'Fixed top header — logo, primary CTAs, menu trigger. Drawn over page content; opt-out per template by omitting it.',
     true, true, 0),
  ('ui_side_menu_right', 'UI · Side Menu (Right)',
     'Slide-out drawer anchored to the right of the viewport. Triggered by the top-bar menu button or by setting trigger=always.',
     true, true, 1),
  ('ui_agent',           'UI · AI Agent (inactive)',
     'Floating AI assistant bubble. Placeholder — editor + renderer ship in a later phase.',
     true, false, 9)
on conflict (slug) do update
  set name        = excluded.name,
      description = excluded.description,
      is_overlay  = excluded.is_overlay,
      is_active   = excluded.is_active,
      sort_order  = excluded.sort_order;

-- Seed default UI block instances. Content mirrors today's hard-coded
-- Header.tsx / SideMenu.tsx defaults so AppShell renders identically
-- once it switches to the template-driven chrome.

insert into public.blocks (id, type_slug, slug, name, content)
values (
  '22222222-2222-2222-2222-222222222221',
  'ui_top',
  'ui_top_default',
  'Site Top Bar — Default',
  jsonb_build_object(
    'overlay_z',       40,
    'overlay_anchor',  'top',
    'overlay_trigger', 'always',
    'logo_dark_url',   '/anamaya-logo.webp',
    'logo_light_url',  '/anamaya-logo-white.webp',
    'logo_width',      300,
    'logo_height',     136,
    'cta_label',       'CALENDAR',
    'cta_href',        '/rg-calendar/',
    'menu_label',      'MENU',
    'lightmode_when_over_video', true
  )
)
on conflict (slug) do nothing;

insert into public.blocks (id, type_slug, slug, name, content)
values (
  '22222222-2222-2222-2222-222222222222',
  'ui_side_menu_right',
  'ui_side_menu_right_default',
  'Site Side Menu — Default (Right)',
  jsonb_build_object(
    'overlay_z',       50,
    'overlay_anchor',  'right',
    'overlay_trigger', 'on-menu',
    'width_max_px',    384,
    'cta_label',       'BOOK YOUR STAY',
    'cta_href',        '/rg-calendar/',
    'use_nav_data',    true
  )
)
on conflict (slug) do nothing;

-- Site-chrome page template: the wrapper AppShell renders around
-- {children}. Pages can override by mounting a different template
-- (e.g. a landing page with no chrome).

insert into public.page_templates (slug, name)
values ('site_chrome', 'Site Chrome (Header + Side Menu)')
on conflict (slug) do nothing;

insert into public.page_template_variants (page_template_id, slug, name, is_default)
select id, 'site_chrome_default', 'Default', true
  from public.page_templates where slug = 'site_chrome'
on conflict (page_template_id, slug) do nothing;

insert into public.page_template_variant_blocks (page_template_variant_id, block_id, sort_order)
select v.id, b.id, 10
  from public.page_template_variants v
  join public.blocks b on b.slug = 'ui_top_default'
 where v.slug = 'site_chrome_default'
   and not exists (
     select 1 from public.page_template_variant_blocks x
      where x.page_template_variant_id = v.id and x.block_id = b.id
   );

insert into public.page_template_variant_blocks (page_template_variant_id, block_id, sort_order)
select v.id, b.id, 20
  from public.page_template_variants v
  join public.blocks b on b.slug = 'ui_side_menu_right_default'
 where v.slug = 'site_chrome_default'
   and not exists (
     select 1 from public.page_template_variant_blocks x
      where x.page_template_variant_id = v.id and x.block_id = b.id
   );
