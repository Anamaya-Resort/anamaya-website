-- ============================================================
-- 0022: Register 8 new general-purpose block types
--
-- These are the primitives used to compose retreat pages (and any
-- other content type that needs them). The renderers + editors ship
-- in the same commit. None of them are retreat-specific — a "retreat
-- leader bio" section, for example, is just a person_card instance
-- with the retreat-leader's data piped in.
-- ============================================================

INSERT INTO public.block_types (slug, name, description) VALUES
  ('divider',       'Divider',
     'Section break — horizontal rule, ornament/flourish, or pure spacer.'),
  ('quote',         'Quote / Testimonial',
     'Pull quote, card with photo, or full-width banner testimonial.'),
  ('date_range',    'Date Range',
     'Formatted date range with optional label; falls back to free text when no dates.'),
  ('pricing_table', 'Pricing Table',
     'N tiers of name + price + note; supports a highlighted "best value" tier.'),
  ('feature_list',  'Feature List',
     'List of items (title + description + optional price/icon/image) — stack, grid, or alternating split.'),
  ('gallery',       'Image Gallery',
     'Grid, masonry, or horizontal-scroll carousel of images, with optional lightbox.'),
  ('person_card',   'Person Card',
     'Bio block — photo, name, credentials, rich-text body, and optional link. Side-by-side or stacked.'),
  ('raw_html',      'Raw HTML',
     'Escape hatch for one-off legacy markup. Content must be sanitized at write time.')
ON CONFLICT (slug) DO UPDATE
  SET name = excluded.name,
      description = excluded.description;
