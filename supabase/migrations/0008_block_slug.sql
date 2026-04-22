-- Per-block slug used as the shortcode identifier. Default generated as
-- {type_slug}_{n} where n is the block's 1-based position within its type
-- (oldest first). Users can rename via the admin UI; uniqueness is enforced.
-- Example shortcode displayed in the admin: [#press_bar_1]

alter table public.blocks
  add column if not exists slug text;

-- Backfill existing rows.
with numbered as (
  select id,
         type_slug || '_' || row_number() over (partition by type_slug order by created_at)
           as new_slug
  from public.blocks
)
update public.blocks b
   set slug = n.new_slug
  from numbered n
 where b.id = n.id
   and b.slug is null;

alter table public.blocks
  alter column slug set not null;

create unique index if not exists blocks_slug_unique on public.blocks(slug);

-- Rename the old admin-label column so the UI can use "name" for the
-- human-readable label and "slug" for the shortcode identifier. We keep
-- the existing "name" column as-is (still holds the display label).
-- No rename needed; documenting for future readers.
