-- Reusable FAQ sets ("FAQ-#"): a named/coded set of Q&A built in the two-panel
-- FAQ builder, saved for reuse and applied to specific pages/posts (which
-- copies its items into that page's page_faqs, so the FAQ block renders them
-- with schema). Distinct from page_faqs, which is the per-page live set.
--
-- Applied to prod via the Supabase management API; kept here for the record.

create table if not exists public.faq_sets (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,          -- e.g. "FAQ-12"
  name        text not null default '',
  items       jsonb not null default '[]'::jsonb,  -- [{question, answer, is_featured}]
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.faq_sets enable row level security;

drop trigger if exists faq_sets_set_updated_at on public.faq_sets;
create trigger faq_sets_set_updated_at
  before update on public.faq_sets
  for each row execute function public.set_updated_at();
