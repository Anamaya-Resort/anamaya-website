-- Supersedes 0012. The 0012 migration tried to use a `templates` table,
-- which collides with the pre-existing WP-template-discovery table from
-- migration 0001 (that one has a NOT NULL `kind` column). Rename all of
-- the CMS page-layout tables so both concepts can co-exist.
--
-- 0012 may have already created the empty helper tables on some DBs —
-- drop them first so we start clean.

drop table if exists public.template_variant_blocks cascade;
drop table if exists public.template_variants cascade;
-- NOTE: the pre-existing public.templates table (from 0001) is kept
-- as-is; its `templates_set_updated_at` trigger remains bound to it.

create table if not exists public.page_templates (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,        -- 'home', 'retreat', 'blog-post'
  name       text not null,               -- human label, e.g. 'Home Page'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists page_templates_set_updated_at on public.page_templates;
create trigger page_templates_set_updated_at
  before update on public.page_templates
  for each row execute function public.set_updated_at();

create table if not exists public.page_template_variants (
  id               uuid primary key default gen_random_uuid(),
  page_template_id uuid not null references public.page_templates(id) on delete cascade,
  slug             text not null,
  name             text not null,
  is_default       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (page_template_id, slug)
);
drop trigger if exists page_template_variants_set_updated_at on public.page_template_variants;
create trigger page_template_variants_set_updated_at
  before update on public.page_template_variants
  for each row execute function public.set_updated_at();

create table if not exists public.page_template_variant_blocks (
  id                        uuid primary key default gen_random_uuid(),
  page_template_variant_id  uuid not null references public.page_template_variants(id) on delete cascade,
  block_id                  uuid not null references public.blocks(id) on delete cascade,
  sort_order                integer not null default 0,
  created_at                timestamptz not null default now()
);
create index if not exists page_template_variant_blocks_order_idx
  on public.page_template_variant_blocks(page_template_variant_id, sort_order);

-- ── Seed: Home Page template + default variant + 2 existing blocks ─────

insert into public.page_templates (slug, name)
values ('home', 'Home Page')
on conflict (slug) do nothing;

insert into public.page_template_variants (page_template_id, slug, name, is_default)
select id, 'home_v1', 'Home V1 (default)', true
  from public.page_templates where slug = 'home'
on conflict (page_template_id, slug) do nothing;

insert into public.page_template_variant_blocks (page_template_variant_id, block_id, sort_order)
select v.id, b.id, 10
  from public.page_template_variants v
  join public.blocks b on b.slug = 'hero_vid_1'
 where v.slug = 'home_v1'
   and not exists (
     select 1 from public.page_template_variant_blocks x
      where x.page_template_variant_id = v.id and x.block_id = b.id
   );

insert into public.page_template_variant_blocks (page_template_variant_id, block_id, sort_order)
select v.id, b.id, 20
  from public.page_template_variants v
  join public.blocks b on b.slug = 'press_bar_1'
 where v.slug = 'home_v1'
   and not exists (
     select 1 from public.page_template_variant_blocks x
      where x.page_template_variant_id = v.id and x.block_id = b.id
   );
