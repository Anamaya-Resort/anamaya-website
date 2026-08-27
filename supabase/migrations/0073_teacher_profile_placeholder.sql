-- ============================================================
-- 0073: Give the shared teacher_profile_default block real placeholder
-- content so the admin template editor's preview isn't blank.
--
-- It was intentionally empty (real content lives per-page via
-- page_block_overrides, e.g. Angela Boltz's page), but that made the
-- template look broken/unbuilt when viewed in the abstract editor.
-- Idempotent.
-- ============================================================

update public.blocks
set content = '{"credentials": "Certification \u00b7 Specialty", "name": "Teacher Name", "banner_url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/64f23082-a9a9-40d0-9619-85dcf9df650d/gallery/hero-image-83-6bb3879c.png", "photo_url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/64f23082-a9a9-40d0-9619-85dcf9df650d/gallery/angela-boltz-31b825b6.jpg", "bio_html": "<p>This is placeholder text showing where a teacher''s biography appears. Each retreat leader''s real page overrides this block with their own name, photo, credentials, and bio -- this shared block is just the design shell.</p>", "specialties": ["Specialty One", "Specialty Two", "Specialty Three"]}'::jsonb
where slug = 'teacher_profile_default';
