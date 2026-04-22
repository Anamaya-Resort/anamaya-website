-- Templates: reusable page layouts composed of blocks. A page like the
-- Home Page has a template; the template can have multiple variants for
-- A/B testing. Each variant is an ordered list of block references.
--
-- Block content is stored in `blocks`; templates only reference them.
-- That means the same block (e.g. the "Recommended by" press bar) can
-- appear in many templates, and edits to the block flow through.

create table if not exists public.templates (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,        -- 'home', 'retreat', 'blog-post'
  name       text not null,               -- human label, e.g. 'Home Page'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists templates_set_updated_at on public.templates;
create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

create table if not exists public.template_variants (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  slug        text not null,              -- 'home_v1', 'home_v2'
  name        text not null,              -- 'Home V1 (default)'
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (template_id, slug)
);
drop trigger if exists template_variants_set_updated_at on public.template_variants;
create trigger template_variants_set_updated_at
  before update on public.template_variants
  for each row execute function public.set_updated_at();

create table if not exists public.template_variant_blocks (
  id                   uuid primary key default gen_random_uuid(),
  template_variant_id  uuid not null references public.template_variants(id) on delete cascade,
  block_id             uuid not null references public.blocks(id) on delete cascade,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now()
);
create index if not exists template_variant_blocks_order_idx
  on public.template_variant_blocks(template_variant_id, sort_order);

-- ── Seed: Home Page template + default variant + 2 existing blocks ─────

insert into public.templates (slug, name)
values ('home', 'Home Page')
on conflict (slug) do nothing;

insert into public.template_variants (template_id, slug, name, is_default)
select id, 'home_v1', 'Home V1 (default)', true
  from public.templates where slug = 'home'
on conflict (template_id, slug) do nothing;

-- Attach hero_vid_1 and press_bar_1 (if they exist) to the default variant.
-- Guards against double-insertion on re-run.
insert into public.template_variant_blocks (template_variant_id, block_id, sort_order)
select v.id, b.id, 10
  from public.template_variants v
  join public.blocks b on b.slug = 'hero_vid_1'
 where v.slug = 'home_v1'
   and not exists (
     select 1 from public.template_variant_blocks x
      where x.template_variant_id = v.id and x.block_id = b.id
   );

insert into public.template_variant_blocks (template_variant_id, block_id, sort_order)
select v.id, b.id, 20
  from public.template_variants v
  join public.blocks b on b.slug = 'press_bar_1'
 where v.slug = 'home_v1'
   and not exists (
     select 1 from public.template_variant_blocks x
      where x.template_variant_id = v.id and x.block_id = b.id
   );
