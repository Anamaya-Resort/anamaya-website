-- ============================================================
-- 0070: Rename "yoga-teachers" -> "retreat-leaders"
--
-- Anamaya hosts many types of retreats, not just yoga -- the AnamayOS-
-- driven teacher/leader profile system needs its own section, separate
-- from the legacy WP "yoga-teachers"/"guest-yoga-teachers" categories
-- (which stay as-is; they're historical scraped content, untouched here).
--
-- Idempotent (safe to re-run; no-ops if already renamed).
-- ============================================================

update public.page_templates
set slug = 'single-retreat_leader', name = 'Retreat Leader Profile'
where slug = 'single-yoga_teacher';

update public.url_inventory
set url = 'https://anamaya.com/retreat-leaders/angela-boltz/',
    url_path = '/retreat-leaders/angela-boltz/',
    post_type = 'retreat_leader'
where url_path = '/yoga-teachers/angela-boltz/';

update public.blocks
set content = content || '{"link_href": "/retreat-leaders/angela-boltz/"}'::jsonb
where slug = 'retreat_leader_wbn_angela';
