-- ============================================================
-- Snapshot Phase C: store the self-contained "frozen" HTML for each
-- migrated v2 page.
--
-- When url_inventory.cms_template_id is null, the catch-all route
-- serves content_items.frozen_html as-is so visitors see the
-- original page exactly as it looked on staging WP.
--
-- When cms_template_id is set, the new template renders instead and
-- frozen_html becomes a fallback / audit reference.
--
-- frozen_html is the page HTML with every CSS/JS/image/font URL
-- rewritten to point at the public Supabase Storage bucket
-- "snapshot" (populated by Phase B).
--
-- frozen_at lets us tell when the snapshot was last (re-)taken;
-- handy for spot-checking staleness when staging WP changes after
-- the freeze.
-- ============================================================

alter table public.content_items
  add column if not exists frozen_html text,
  add column if not exists frozen_at   timestamptz;

create index if not exists content_items_frozen_at_idx
  on public.content_items (frozen_at);
