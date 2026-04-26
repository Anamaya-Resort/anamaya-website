-- ============================================================
-- 0021: Retreat Import Staging Tables
--
-- Website-side staging so the WP→AO import is iterable + idempotent
-- without dirtying AnamayOS. Once a row is reviewed and pushed, AO is
-- the source of truth and these rows are kept only for audit/replay.
--
--   1. retreat_imports  — one row per retreat being imported
--   2. image_imports    — one row per upload, sha256-deduped, links the
--                         original WP-Engine URL to its AO Storage URL
-- ============================================================

CREATE TABLE IF NOT EXISTS retreat_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url_inventory_id uuid NOT NULL REFERENCES url_inventory(id) ON DELETE CASCADE,
  url_path text NOT NULL,
  title text,

  -- The full extracted record (AO-shaped retreat + nested teacher,
  -- pricing tiers, workshops, gallery, testimonials, page_blocks) plus
  -- a list of warnings the extractor emitted. Lives as jsonb so the
  -- shape can evolve while the extractor is iterated; AO writes resolve
  -- against the typed schema at push time.
  extracted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,

  status text NOT NULL DEFAULT 'pending_review',
    -- 'pending_review' | 'approved' | 'pushed_to_ao' | 'failed' | 'skipped'
  failure_reason text,

  ao_retreat_id uuid,                    -- set after successful push
  pushed_at timestamptz,
  reviewed_by text,                      -- email of the admin who approved
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (url_inventory_id)
);
CREATE INDEX IF NOT EXISTS idx_retreat_imports_status ON retreat_imports(status);
CREATE INDEX IF NOT EXISTS idx_retreat_imports_ao_retreat ON retreat_imports(ao_retreat_id) WHERE ao_retreat_id IS NOT NULL;


CREATE TABLE IF NOT EXISTS image_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Original WP-Engine URL we pulled from. Kept for audit + so we can
  -- detect repeats across retreats (the same flower-divider image
  -- appears on every page).
  source_url text NOT NULL,
  source_hash char(64) NOT NULL,

  -- AO Storage destination
  ao_bucket text NOT NULL,                -- 'retreat-media' | 'retreat-leader-photos' | 'general-media'
  ao_path text NOT NULL,                  -- "{retreat_id}/gallery/lower-deck.webp"
  ao_public_url text NOT NULL,

  -- Metadata captured at upload time (handy for <img width/height>)
  width int,
  height int,
  file_size int,
  mime_type text,
  alt_text text,

  status text NOT NULL DEFAULT 'uploaded',
    -- 'uploaded' | 'failed' | 'skipped_denylist'
  failure_reason text,

  imported_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (source_hash)
);
CREATE INDEX IF NOT EXISTS idx_image_imports_status ON image_imports(status);
CREATE INDEX IF NOT EXISTS idx_image_imports_source_url ON image_imports(source_url);
CREATE INDEX IF NOT EXISTS idx_image_imports_ao_path ON image_imports(ao_bucket, ao_path);


-- ── Decorative-image denylist ──
-- Filenames or path fragments that match are skipped during import
-- (dividers, decorative buttons, repeating background patterns). The
-- denylist seeds with the boilerplate the WP retreat template embeds
-- on every page; admin can extend it from the review UI.
CREATE TABLE IF NOT EXISTS image_import_denylist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL UNIQUE,           -- substring match against source_url
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO image_import_denylist (pattern, reason) VALUES
  ('flower-divider',         'Decorative section divider'),
  ('swirls-repeat',          'Decorative background pattern'),
  ('Tranformation.-Book-now','"Book now" CTA button graphic — replaced by template button'),
  ('Book-now',               '"Book now" CTA button graphic — replaced by template button')
ON CONFLICT (pattern) DO NOTHING;
