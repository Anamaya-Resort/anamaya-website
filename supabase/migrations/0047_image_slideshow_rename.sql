-- Rename the image_slideshow block type to "Hero with Slideshow" and
-- pin its sort_order just below the existing "Hero with Video" (which
-- has the default sort_order = 100). The slug stays as `image_slideshow`
-- since that's the canonical type-key referenced from code; only the
-- human-readable label and ordering change.

update public.block_types
   set name       = 'Hero with Slideshow',
       sort_order = 99
 where slug = 'image_slideshow';
