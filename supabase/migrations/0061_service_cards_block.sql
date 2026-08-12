-- ============================================================
-- 0061: Service Cards block type
--
-- An "advanced" service list where each service is a CARD: name, price,
-- a one-line blurb, a native <details> "More info" accordion (longer
-- description + optional route/time rows + a link), and a RIGHT-SIDE 3:2
-- image. Cards WITHOUT an image render full-width text — never an empty box.
--
-- DUAL-MODE (mirrors ServiceMenuBlock + DetailsRatesDynamicBlock):
--   - When `domain` is set, cards are read LIVE from AnamayaOS
--     (service_catalog, filtered by domain + is_active).
--   - Otherwise, or when AO errors / returns nothing, it renders the manual
--     `items` list stored on the block (the fallback used today).
--
-- The block holds display settings + the manual fallback cards — never live
-- prices (those come from AnamayaOS).
--
-- Fully idempotent.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order)
values
  ('service_cards', 'Service Cards',
     'Advanced service list — each service is a card with a name, price, one-line blurb, a "More info" accordion (longer description + optional route/time + a link), and an optional right-side 3:2 image (no image = full-width text). Dual-mode: reads services LIVE from AnamayaOS when a domain is set, otherwise renders a manual list stored on the block.',
     false, true, 103)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      is_overlay = excluded.is_overlay,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order;

-- Seed one previewable instance (manual mode) so
-- /block-preview/service_cards_demo demonstrates BOTH states: one card WITH
-- an image (right-side 3:2) and one WITHOUT (full-width text).
insert into public.blocks (slug, type_slug, name, content)
values (
  'service_cards_demo',
  'service_cards',
  'Service Cards (demo)',
  '{
    "heading": "Getting Here",
    "show_divider": true,
    "items": [
      {
        "name": "Private Shuttle",
        "price": "$25 + tax each way",
        "blurb": "We can arrange a private taxi to meet your domestic flight.",
        "description": "When you fly into Cobano (ACO) we can arrange a taxi to meet your domestic flight and bring you the last 15-20 minutes to Anamaya. If other guests are on your flight the cost can be split.",
        "image_url": "/spa/divider-red.webp",
        "route": "Cobano (ACO) → Anamaya",
        "duration": "15-20 min",
        "link_label": "Ask about arranging a shuttle",
        "link_href": "mailto:info@anamaya.com"
      },
      {
        "name": "Airport Assistance",
        "price": "Free",
        "blurb": "Help planning the smoothest route from San José to Montezuma.",
        "description": "Send us your flight details and we will help you plan the best connection — domestic flight, shared shuttle, or private car — so your arrival is as smooth as possible.",
        "image_url": "",
        "link_label": "Email your flight details",
        "link_href": "mailto:info@anamaya.com"
      }
    ]
  }'::jsonb
)
on conflict (slug) do nothing;
