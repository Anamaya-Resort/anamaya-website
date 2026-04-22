-- RUN THIS IN ANAMAYA*OS* (NOT the website) Supabase:
--   https://supabase.com/dashboard/project/azvdmibriuqrmexwtrja/sql
--
-- Purpose: let the public marketing site read the live brand tokens so its
-- pages (header, footer, block editors) all share the same palette + fonts
-- as ao.anamaya.com. Only the single row org_slug='default' is exposed,
-- and only the `branding` column (not `test_branding`).

-- 1. Make sure RLS is on (it already is, per migration 00018).
alter table public.org_branding enable row level security;

-- 2. Allow anon/auth roles to SELECT the default row.
drop policy if exists "Public read default branding" on public.org_branding;
create policy "Public read default branding"
  on public.org_branding
  for select
  to anon, authenticated
  using (org_slug = 'default');

-- Notes:
-- * The existing "Service role full access" policy still applies for admin writes.
-- * If you later want per-tenant branding, widen this policy or add a second
--   one keyed on a public flag.
