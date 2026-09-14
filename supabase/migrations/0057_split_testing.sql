-- Split testing (A/B) foundation.
--
-- Model: a "test group" ties one ORIGINAL page (the control) to one or more
-- VARIANT pages (clones the owner edits). All members are ordinary
-- url_inventory content rows; the split columns below record membership.
-- An article can belong to only ONE group (single split_group_id column).
--
-- Live traffic all stays on the CONTROL's url_path; the public resolver
-- picks which member to render per visitor (sticky, server-side, no flicker)
-- and logs first-party impression / cta_click / dwell events attributed to
-- the member actually shown. Writes are service-role only (like 0056), so
-- RLS stays on with no public policies.

-- ── Groups ────────────────────────────────────────────────────────────
create table if not exists public.split_test_groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  goal         text not null default 'booking_click', -- primary conversion metric
  status       text not null default 'running',        -- running | paused | ended
  source_site  text not null default 'v2',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists split_test_groups_set_updated_at on public.split_test_groups;
create trigger split_test_groups_set_updated_at
  before update on public.split_test_groups
  for each row execute function public.set_updated_at();

alter table public.split_test_groups enable row level security;

-- ── Membership columns on url_inventory (nullable, safe) ───────────────
-- split_group_id  : the group this row belongs to (null = not in a test).
-- split_variant_of: the CONTROL row's id (null = this row IS the control).
-- split_label     : display label, e.g. 'Original', 'Variant B'.
-- split_weight    : relative traffic share within the group (default 1).
alter table public.url_inventory
  add column if not exists split_group_id   uuid,
  add column if not exists split_variant_of uuid,
  add column if not exists split_label      text,
  add column if not exists split_weight     integer not null default 1;

create index if not exists url_inventory_split_group_idx
  on public.url_inventory (split_group_id) where split_group_id is not null;
create index if not exists url_inventory_split_variant_of_idx
  on public.url_inventory (split_variant_of) where split_variant_of is not null;

-- ── First-party split-test events ─────────────────────────────────────
-- One row per tracked event. variant_id = the url_inventory row actually
-- shown to the visitor. session_id = the per-visitor sticky id (ab_vid
-- cookie). dwell_ms set only on 'dwell' rows.
create table if not exists public.split_test_events (
  id          bigint generated always as identity primary key,
  group_id    uuid not null,
  variant_id  uuid not null,
  session_id  text not null,
  event_type  text not null check (event_type in ('impression', 'cta_click', 'dwell')),
  dwell_ms    integer,
  created_at  timestamptz not null default now()
);
create index if not exists split_test_events_group_idx   on public.split_test_events (group_id);
create index if not exists split_test_events_variant_idx on public.split_test_events (variant_id);

alter table public.split_test_events enable row level security;

-- ── Aggregated per-variant stats (VIEW, always correct) ───────────────
-- impressions, unique visitors, CTA clicks, and average dwell (time on
-- page, ms) per member of each group. Read server-side only.
create or replace view public.split_test_stats as
select
  group_id,
  variant_id,
  count(*) filter (where event_type = 'impression')            as impressions,
  count(distinct session_id) filter (where event_type = 'impression') as visitors,
  count(*) filter (where event_type = 'cta_click')             as cta_clicks,
  avg(dwell_ms) filter (where event_type = 'dwell')            as avg_dwell_ms
from public.split_test_events
group by group_id, variant_id;
