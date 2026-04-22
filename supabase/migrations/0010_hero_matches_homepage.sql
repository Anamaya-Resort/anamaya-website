-- Seed / update a "Homepage Hero" block whose content matches the current
-- hardcoded <VideoHero> on the homepage. Run order:
--   1. If any hero block already exists, update it in place (preserves slug + id).
--   2. If none exist, insert a fresh one with slug "hero_1".
--
-- Config mirrors /src/app/(site)/page.tsx:
--   youtube_id = 9d5jqBsUpWI, poster = /yoga_retreat_costarica.webp,
--   overlay 15, 80vh, fit=cover, no bands.

do $$
declare
  target_id uuid;
  config jsonb := jsonb_build_object(
    'video_source',    'youtube',
    'youtube_url',     '9d5jqBsUpWI',
    'video_url',       '',
    'video_poster_url','/yoga_retreat_costarica.webp',
    'fit',             'cover',
    'height_vh',       80,
    'overlay_opacity', 15,
    'top',             jsonb_build_object('enabled', false),
    'bottom',          jsonb_build_object('enabled', false)
  );
begin
  select id into target_id
    from public.blocks
   where type_slug = 'hero'
   order by created_at asc
   limit 1;

  if target_id is not null then
    update public.blocks
       set content = config,
           name = coalesce(nullif(name, ''), 'Homepage Hero')
     where id = target_id;
  else
    insert into public.blocks (type_slug, name, slug, content)
    values ('hero', 'Homepage Hero', 'hero_1', config);
  end if;
end $$;
