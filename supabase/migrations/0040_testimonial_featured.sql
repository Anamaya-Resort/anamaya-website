-- Per-(category × testimonial) featured flag. The Testimonials block
-- on the public site reads only featured rows from its assigned
-- category, so editors can curate a smaller "best of" rotation
-- without removing review assignments from the category entirely.

alter table public.testimonial_set_items
  add column if not exists featured boolean not null default false;

create index if not exists testimonial_set_items_featured_idx
  on public.testimonial_set_items(set_id, featured);

do $$
begin
  perform 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'testimonial_set_items'
    and column_name  = 'featured';
  if not found then
    raise exception 'testimonial_set_items.featured column failed to add';
  end if;
end $$;
