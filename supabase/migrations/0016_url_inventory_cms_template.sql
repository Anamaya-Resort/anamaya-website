-- Phase 3 (Website Builder): give every url_inventory row an optional
-- pointer at the CMS rebuild template. Distinct from the existing
-- `template_id` column (which references the WP-discovery `templates`
-- table from 0001) and from `wp_template` (the WP page-template override
-- string). Null = render via the rich-text fallback.

alter table public.url_inventory
  add column if not exists cms_template_id uuid
    references public.page_templates(id) on delete set null;

create index if not exists url_inventory_cms_template_idx
  on public.url_inventory (cms_template_id);

-- Rich-text body authored in the Website Builder editor. Falls back to
-- content_items.content_rendered (migrated WP HTML) when null.
alter table public.content_items
  add column if not exists cms_body_html text,
  add column if not exists cms_body_updated_at timestamptz;
