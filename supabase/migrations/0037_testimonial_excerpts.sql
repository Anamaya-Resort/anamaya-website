-- Per-(testimonial × category) excerpt. Each review can be categorised
-- into multiple categories (yoga, cuisine, accommodations, …) and each
-- assignment carries its own 1–2 sentence sound-bite extracted from the
-- full review_text. The full review remains in public.testimonials,
-- unchanged; the carousel renders the category-specific excerpt.

alter table public.testimonial_set_items
  add column if not exists excerpt text;

-- The `updated_at` field on the join row would be useful for editor
-- sorting but isn't critical; skip for now.

-- Sanity check: column exists.
do $$
begin
  perform 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'testimonial_set_items'
    and column_name  = 'excerpt';
  if not found then
    raise exception 'testimonial_set_items.excerpt column failed to add';
  end if;
end $$;
