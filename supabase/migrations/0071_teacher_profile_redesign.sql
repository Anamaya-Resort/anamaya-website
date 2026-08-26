-- ============================================================
-- 0071: Teacher Profile redesign content -- add a real wide banner photo
--
-- Angela Boltz's page only had a square portrait crop, which would look
-- badly stretched as a wide hero background. Points the new banner_url
-- at a real, already-used Anamaya location photo (pool deck) instead.
--
-- Idempotent.
-- ============================================================

update public.page_block_overrides
set content = content || '{"banner_url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/027a4a94-a39f-4421-9338-878953d743db/gallery/relax-on-the-pool-deck-at-anamaya-resort-300x300-87bae3ad.jpg"}'::jsonb
where url_inventory_id = (select id from public.url_inventory where url_path = '/retreat-leaders/angela-boltz/');
