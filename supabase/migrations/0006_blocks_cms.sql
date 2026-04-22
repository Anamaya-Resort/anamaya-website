-- Composable-page CMS: blocks + usages + overrides.
-- Website-only (does not live in AO's Supabase). AO-owned entities
-- (retreats, rooms, people, products) are read cross-project at render time.

create table public.block_types (
  slug        text primary key,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table public.blocks (
  id         uuid primary key default gen_random_uuid(),
  type_slug  text not null references public.block_types(slug),
  name       text not null,                         -- admin label, e.g. "Homepage Press Bar"
  content    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index blocks_type_idx on public.blocks(type_slug);

create trigger blocks_set_updated_at
  before update on public.blocks
  for each row execute function public.set_updated_at();

-- Where a block is placed. page_key is a symbolic template identifier
-- ("homepage", "retreat-template", "ytt-template", "page/about", …).
-- Multiple pages can reference the same block; editing the block updates
-- them all. override_content (null by default) lets a specific usage
-- diverge from the master without affecting the others.
create table public.block_usages (
  id               uuid primary key default gen_random_uuid(),
  block_id         uuid not null references public.blocks(id) on delete cascade,
  page_key         text not null,
  sort_order       integer not null default 0,
  override_content jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index block_usages_page_idx on public.block_usages(page_key);
create index block_usages_block_idx on public.block_usages(block_id);

create trigger block_usages_set_updated_at
  before update on public.block_usages
  for each row execute function public.set_updated_at();

alter table public.block_types enable row level security;
alter table public.blocks enable row level security;
alter table public.block_usages enable row level security;

-- Seed the four block types we support initially.
insert into public.block_types (slug, name, description) values
  ('rich_text',  'Rich Text',  'A block of formatted HTML content.'),
  ('hero',       'Hero',       'Image/video + heading + subheading + optional CTA button.'),
  ('cta_banner', 'CTA Banner', 'Centered heading + button, optionally over a background image.'),
  ('press_bar',  'Press Bar',  'Full-width "Recommended by" bar with a row of publication logos and article links.');

-- Seed the existing Press Bar (current hardcoded PressBar.tsx content).
insert into public.blocks (id, type_slug, name, content) values (
  '11111111-1111-1111-1111-111111111111',
  'press_bar',
  'Site Press Bar — Recommended By',
  jsonb_build_object(
    'heading', 'Recommended by:',
    'column_widths_pct', jsonb_build_array(10, 10, 10, 10, 20, 10, 10, 10, 10),
    'logos', jsonb_build_array(
      jsonb_build_object('name', 'Condé Nast Traveler',
        'src', '/press/cnt.webp', 'width', 100, 'height', 31, 'href', null,
        'featured', false),
      jsonb_build_object('name', 'National Post',
        'src', '/press/national-post.webp', 'width', 100, 'height', 17,
        'href', 'https://nationalpost.com/travel/salutation-to-the-fun-chill-out-in-a-good-way-on-a-costa-rican-yoga-retreat-2',
        'featured', false),
      jsonb_build_object('name', 'Elle',
        'src', '/press/elle.webp', 'width', 100, 'height', 36,
        'href', 'https://www.elle.com/es/living/viajes/news/a620018/viajes-para-yoguis/',
        'featured', false),
      jsonb_build_object('name', 'Forbes',
        'src', '/press/forbes.webp', 'width', 100, 'height', 25,
        'href', 'https://www.forbes.com/sites/annabel/2019/08/20/5-yoga-retreats-to-book-for-fall-2019/',
        'featured', false),
      jsonb_build_object('name', 'National Geographic',
        'src', '/press/national-geographic.webp', 'width', 300, 'height', 88,
        'href', 'https://www.nationalgeographic.com/travel/best-of-the-world-2026/article/best-wellness-destinations',
        'featured', true),
      jsonb_build_object('name', 'The Independent',
        'src', '/press/independent.webp', 'width', 100, 'height', 9,
        'href', 'https://www.independent.co.uk/travel/hotels/the-big-six-central-american-boutique-hotels-1869092.html',
        'featured', false),
      jsonb_build_object('name', 'Travel + Leisure',
        'src', '/press/travel-and-leisure.webp', 'width', 100, 'height', 23,
        'href', 'https://www.travelandleisure.com/trip-ideas/yoga-wellness/best-yoga-retreats',
        'featured', false),
      jsonb_build_object('name', 'Fashion Magazine',
        'src', '/press/fashion.webp', 'width', 100, 'height', 22,
        'href', 'https://fashionmagazine.com/wellness/health/exotic-resorts-bikini-body-prep/',
        'featured', false),
      jsonb_build_object('name', 'SmarterTravel',
        'src', '/press/smartertravel.webp', 'width', 100, 'height', 11,
        'href', 'https://www.smartertravel.com/wellness-travel-101-vacation-your-way-to-a-better-you/',
        'featured', false)
    )
  )
);

-- Place the press bar on the homepage and on every retreat page.
-- Editing the single block updates both simultaneously.
insert into public.block_usages (block_id, page_key, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'homepage',         10),
  ('11111111-1111-1111-1111-111111111111', 'retreat-template', 10);
