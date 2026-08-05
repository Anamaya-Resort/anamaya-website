-- FAQ block: per-page FAQ storage.
--
-- The FAQ block can sit on a template (so it appears on every page/post
-- that uses that template), but each page/post has its OWN list of FAQs,
-- generated from that page's content. So the FAQ text can't live in the
-- shared block instance — it lives here, keyed to the url_inventory row.
--
-- The public renderer only READS approved rows (so bots always get
-- already-generated, reviewed answers baked into the server HTML — never
-- an on-the-fly generation during a crawl). Drafting/editing happens in
-- the admin.
--
-- DDL only (tables/indexes/RLS). The block_type registration is done
-- separately via the app (supabase-js), to avoid copy/paste mangling of
-- apostrophes in the description text.

-- ============================================================
-- page_faqs: one row per FAQ, per page/post.
-- ============================================================
create table if not exists public.page_faqs (
  id                uuid primary key default gen_random_uuid(),
  url_inventory_id  uuid not null references public.url_inventory(id) on delete cascade,
  question          text not null,
  answer            text not null,
  is_featured       boolean not null default false,
  sort_order        integer not null default 0,
  -- provenance: 'ai' = as drafted, 'edited' = an AI draft a human changed,
  -- 'manual' = a human wrote it from scratch.
  source            text not null default 'ai'
                      check (source in ('ai', 'edited', 'manual')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists page_faqs_page_idx
  on public.page_faqs (url_inventory_id, sort_order);

drop trigger if exists page_faqs_set_updated_at on public.page_faqs;
create trigger page_faqs_set_updated_at
  before update on public.page_faqs
  for each row execute function public.set_updated_at();

alter table public.page_faqs enable row level security;

-- ============================================================
-- page_faq_meta: per-page generation state + publish gate.
--   approved = true  -> the public block renders this page's FAQs.
--   approved = false -> draft; visible in admin only.
-- ============================================================
create table if not exists public.page_faq_meta (
  url_inventory_id  uuid primary key references public.url_inventory(id) on delete cascade,
  approved          boolean not null default false,
  last_prompt       text,
  model             text,
  generated_at      timestamptz,
  updated_at        timestamptz not null default now()
);

drop trigger if exists page_faq_meta_set_updated_at on public.page_faq_meta;
create trigger page_faq_meta_set_updated_at
  before update on public.page_faq_meta
  for each row execute function public.set_updated_at();

alter table public.page_faq_meta enable row level security;
