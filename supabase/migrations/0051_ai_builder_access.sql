-- Access + publish-rights for the AI Site Builder tool.
--
-- Rows are auto-created the first time an admin opens the tool (the SSO has no
-- list-users API, so we collect users as they appear here). `can_publish` is
-- the Superadmin-granted override: when true, that user may take their own
-- change live without owner approval. Default false = owner-only go-live.
create table if not exists public.ai_builder_access (
  sso_user_id  text primary key,
  email        text,
  display_name text,
  role         text,
  can_publish  boolean     not null default false,
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz not null default now()
);
