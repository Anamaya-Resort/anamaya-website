-- Add a column to hold the full rendered page HTML we scrape from v2 for
-- post types whose content comes from Elementor Theme Builder templates
-- (retreats, accommodations, ytts, etc.) — i.e. NOT from the WP post's
-- content_rendered field. This is migration scaffolding — we'll later
-- parse this into a structured schema shared with AnamayOS.

alter table public.content_items
  add column if not exists scraped_body_html text,
  add column if not exists scraped_at timestamptz;

create index if not exists content_items_scraped_at_idx
  on public.content_items (scraped_at);
