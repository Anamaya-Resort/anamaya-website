-- Add "floating" as a third block "area" (block_types.shape), for overlay
-- chrome like the AI agent and the right side menu. The block maker's "Block
-- Area" filter shows Standard (horizontal) / Side (vertical) / Floating.
--
-- Applied to prod via the Supabase management API; kept here for the record.
-- (Column/value renaming to area/standard/side is tracked in
-- docs/BLOCK_AREA_NOMENCLATURE.md.)

alter table public.block_types drop constraint if exists block_types_shape_check;
alter table public.block_types
  add constraint block_types_shape_check check (shape in ('horizontal', 'vertical', 'floating'));

update public.block_types
set shape = 'floating'
where slug in ('ui_agent', 'ui_side_menu_right');
