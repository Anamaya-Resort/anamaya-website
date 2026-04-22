-- CMS tables for testimonials, editable via the /admin UI.
-- Separate from the `url_inventory` / `content_items` extraction tables,
-- which are raw migration data — these are the site's source of truth.

create table public.testimonials (
  id              uuid primary key default gen_random_uuid(),
  author          text not null,          -- e.g. "Tyke27"
  source          text,                    -- "TripAdvisor", "Google", "Guest Review", etc.
  source_date     text,                    -- free-form: "November 2011", "April 17, 2012"
  rating          integer default 5,       -- 1–5 (TripAdvisor style)
  headline        text,                    -- "Treasure in Paradise..."
  quote           text not null,
  avatar_url      text,
  wp_id           bigint,                  -- link back to v2 wp_id for migration trace
  published       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index testimonials_published_idx on public.testimonials(published);
create index testimonials_wp_id_idx on public.testimonials(wp_id);

create trigger testimonials_set_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

-- Named collections of testimonials that a page can reference.
-- e.g. slug='homepage' pulls its own set, slug='retreats' pulls another.
create table public.testimonial_sets (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,    -- "homepage", "retreats", "ytt", "wellness", "surfing"
  name            text not null,
  description     text,
  autoplay_ms     integer not null default 6000,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger testimonial_sets_set_updated_at
  before update on public.testimonial_sets
  for each row execute function public.set_updated_at();

-- Junction: which testimonials belong in which set, and in what order.
create table public.testimonial_set_items (
  set_id          uuid not null references public.testimonial_sets(id) on delete cascade,
  testimonial_id  uuid not null references public.testimonials(id) on delete cascade,
  sort_order      integer not null default 0,
  primary key (set_id, testimonial_id)
);
create index testimonial_set_items_order_idx
  on public.testimonial_set_items(set_id, sort_order);

alter table public.testimonials enable row level security;
alter table public.testimonial_sets enable row level security;
alter table public.testimonial_set_items enable row level security;
-- No public policies: site pages read via service_role server-side; admin writes also via service_role.

-- Seed the default sets we know we'll need.
insert into public.testimonial_sets (slug, name, description) values
  ('homepage', 'Home Page',     'Testimonials cycling on anamaya.com home'),
  ('retreats', 'Retreats',       'Shown on /retreats/ listing and retreat templates'),
  ('ytt',      'Yoga Teacher Trainings', 'Shown on YTT pages'),
  ('wellness', 'Wellness & Spa', 'Shown on spa and wellness pages'),
  ('surfing',  'Surfing',        'Shown on surfing-related pages'),
  ('cuisine',  'Cuisine',        'Shown on cuisine / chef pages'),
  ('accommodations', 'Accommodations', 'Shown on room detail pages');
