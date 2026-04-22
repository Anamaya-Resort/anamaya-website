-- Rename the first hero block's slug to "hero_vid_1" so the homepage
-- can reference it as [#hero_vid_1]. Only renames the single current
-- hero block; subsequent hero blocks keep their auto-generated slugs.

update public.blocks
   set slug = 'hero_vid_1'
 where type_slug = 'hero'
   and slug <> 'hero_vid_1'
   and not exists (
     select 1 from public.blocks where slug = 'hero_vid_1'
   )
   and id = (
     select id from public.blocks
      where type_slug = 'hero'
      order by created_at asc
      limit 1
   );
