-- ============================================================
-- 0023: Register the two_column block type
--
-- Layout primitive — each side carries another block type's content
-- (rich_text, pricing_table, feature_list, quote, date_range, raw_html)
-- so the renderer can dispatch into BlockRenderer recursively.
--
-- Built specifically to compose retreat-page rows like
--   left = heading + prose
--   right = pricing table + footnote
-- but reusable anywhere a side-by-side layout is needed.
-- ============================================================

INSERT INTO public.block_types (slug, name, description) VALUES
  ('two_column', 'Two Column',
     'Side-by-side layout — each column holds another block type (rich text, pricing table, feature list, quote, date range, raw HTML). Optional shared CTA renders below both columns.')
ON CONFLICT (slug) DO UPDATE
  SET name = excluded.name,
      description = excluded.description;
