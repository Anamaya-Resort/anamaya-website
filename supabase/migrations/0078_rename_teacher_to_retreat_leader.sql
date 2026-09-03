-- Rename the three "Teacher ..." blocks to "Retreat Leader ...": the block TYPE
-- display names and the instance slugs (#codes shown in the block maker). The
-- block TYPE slug (teacher_profile / teacher_retreats_upcoming /
-- teacher_retreats_past) is intentionally left as-is, because it is wired into
-- the renderer/dispatch/editor code; changing that identifier is a separate,
-- coordinated refactor. Only user-facing names and instance codes change here.
--
-- Applied to prod via supabase-js; kept here for the record. Idempotent-ish
-- (re-running is harmless once renamed).

update public.block_types set name = 'Retreat Leader Profile'
  where slug = 'teacher_profile';
update public.block_types set name = 'Retreat Leader''s Upcoming Retreats'
  where slug = 'teacher_retreats_upcoming';
update public.block_types set name = 'Retreat Leader''s Past Retreats'
  where slug = 'teacher_retreats_past';

update public.blocks
  set name = replace(name, 'Teacher', 'Retreat Leader'),
      slug = 'retreat_leader_profile_default'
  where slug = 'teacher_profile_default';
update public.blocks
  set name = replace(name, 'Teacher', 'Retreat Leader'),
      slug = 'retreat_leader_retreats_upcoming_default'
  where slug = 'teacher_retreats_upcoming_default';
update public.blocks
  set name = replace(name, 'Teacher', 'Retreat Leader'),
      slug = 'retreat_leader_retreats_past_default'
  where slug = 'teacher_retreats_past_default';
