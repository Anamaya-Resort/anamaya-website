-- ============================================================
-- 0057: Service Menu block type
--
-- AnamayaOS-driven, categorized service/price menu read LIVE from the
-- `service_catalog` table, parameterized by `domain` (default "spa").
-- The same block later powers cookbook / excursions / biohacking by
-- pointing it at a different domain. Async server block: groups the
-- domain-filtered, active services by their category (labels + order
-- from the shared `spa_categories` table) into treatments + tiered
-- durations/prices, in the "Centered Ceremony" spa-menu design.
--
-- The block holds display settings only — never prices.
--
-- Fully idempotent.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order)
values
  ('service_menu', 'Service Menu',
     'Auto-populated, categorized service/price menu from AnamayaOS (service_catalog, filtered by domain e.g. "spa"). Groups active services by category into treatments with tiered durations/prices, in the ornate centered spa-menu design. To change the menu, edit the services in AnamayaOS.',
     false, true, 102)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      is_overlay = excluded.is_overlay,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order;

-- Seed one usable, previewable block instance for the spa domain so
-- /block-preview/service_menu_spa works. Display defaults live in the
-- renderer; only the domain needs seeding.
insert into public.blocks (slug, type_slug, name, content)
values ('service_menu_spa', 'service_menu', 'Spa Service Menu', '{"domain":"spa"}'::jsonb)
on conflict (slug) do nothing;
