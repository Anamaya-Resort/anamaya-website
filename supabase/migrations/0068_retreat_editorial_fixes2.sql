-- ============================================================
-- 0068: Retreat Editorial fixes round 2
--
-- Round the hero photo's corners to match the rounded-lg cards below it
-- (image_overlay stays square by default everywhere else; this is an
-- opt-in per-instance value via the new corner_radius_px field).
--
-- Idempotent.
-- ============================================================

update public.blocks
set content = content || '{"corner_radius_px": 8}'::jsonb
where slug = 'hero_overlay_wbn_a';
