-- Cached WebP snapshot of each block, used by the variant-carousel in the
-- admin and by the template-builder picker. Generated client-side by
-- html-to-image when a block is saved, uploaded to Supabase Storage,
-- URL stored here.

alter table public.blocks
  add column if not exists snapshot_url text,
  add column if not exists snapshot_updated_at timestamptz;

create index if not exists blocks_snapshot_updated_at_idx
  on public.blocks(snapshot_updated_at);
