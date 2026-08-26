-- ============================================================
-- 0072: Fix the teacher profile banner -- use the real hero image,
-- not a 300x300 thumbnail (would look pixelated stretched wide)
-- ============================================================

update public.page_block_overrides
set content = content || '{"banner_url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/64f23082-a9a9-40d0-9619-85dcf9df650d/gallery/hero-image-83-6bb3879c.png"}'::jsonb
where url_inventory_id = (select id from public.url_inventory where url_path = '/retreat-leaders/angela-boltz/');
