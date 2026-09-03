-- ============================================================
-- 0077: Upgrade converted retreat leader cards to live AnamayOS links
--
-- Since the 5 test conversions were built, a separate retreat_imports
-- "push to AO" run gave 4 of these leaders (previously manual-bio-only)
-- real AnamayOS persons + retreat_leader_profiles rows with real bios
-- and photos. Adding ao_person_id so these cards go fully live (and
-- stay current automatically if AnamayOS updates their bio later),
-- with the existing manual bio/photo remaining as the fallback.
--
-- Idempotent.
-- ============================================================

-- Angela Boltz (Wild by Nature)
update public.page_block_overrides
set content = content || '{"ao_person_id": "5b83d872-e1c6-4640-9cf4-d143e28eabd8"}'::jsonb
where url_inventory_id = '64f23082-a9a9-40d0-9619-85dcf9df650d'
  and variant_block_id = '45734b4c-b726-4800-ad19-2ea272bddb69';

-- Colynn Cespedes (Regulate)
update public.page_block_overrides
set content = content || '{"ao_person_id": "39009e28-a1d6-4d97-be52-2ab901d904a6"}'::jsonb
where url_inventory_id = '200ea630-644d-4ae8-9e16-d2d008ff4d59'
  and variant_block_id = '45734b4c-b726-4800-ad19-2ea272bddb69';

-- Missy Hartley (Awaken Your Path, leader slot 1)
update public.page_block_overrides
set content = content || '{"ao_person_id": "1534436a-4d13-428f-859c-8e6793645da7"}'::jsonb
where url_inventory_id = 'a19ea53e-8606-4dfd-a9f2-8cce7c4c3b34'
  and variant_block_id = '45734b4c-b726-4800-ad19-2ea272bddb69';

-- David Hartley (Awaken Your Path, leader slot 2)
update public.page_block_overrides
set content = content || '{"ao_person_id": "a53fd50a-3a9a-4695-85fe-a7268c4944df"}'::jsonb
where url_inventory_id = 'a19ea53e-8606-4dfd-a9f2-8cce7c4c3b34'
  and variant_block_id = '4a08c4ca-1b80-4e05-871e-97f7dafe90f3';
