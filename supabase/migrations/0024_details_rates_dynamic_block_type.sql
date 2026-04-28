-- ============================================================
-- 0024: Register the details_rates_dynamic block type
--
-- Two-column "Retreat Details + Rates" section. Left column is
-- editor-supplied rich text (typically the boilerplate "Retreat
-- Details" copy); right column pulls active pricing tiers live
-- from AnamayOS so the rate sheet stays in sync with the
-- database. Falls back to manual_tiers when AO is unreachable
-- or the retreat has no active tiers.
--
-- Use this on retreat pages instead of two_column(rich_text +
-- pricing_table) when the prices should track AO. Use the
-- static combo when the editor wants to override AO entirely.
-- ============================================================

INSERT INTO public.block_types (slug, name, description) VALUES
  ('details_rates_dynamic', 'Details + Rates (Dynamic)',
     'Two-column section: rich text on the left, retreat pricing on the right pulled live from AnamayOS by retreat_id. Falls back to manual tiers when AO is unreachable or empty. Optional CTA below.')
ON CONFLICT (slug) DO UPDATE
  SET name = excluded.name,
      description = excluded.description;
