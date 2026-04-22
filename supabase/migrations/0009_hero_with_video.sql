-- Rename the "Hero" block type to "Hero with Video" so the admin UI
-- matches the new top-band/video/bottom-band structure. The slug stays
-- `hero` to avoid touching block_usages or existing block rows.

update public.block_types
   set name = 'Hero with Video',
       description = 'Optional top and bottom bands (text + color) around a YouTube or uploaded video.'
 where slug = 'hero';
