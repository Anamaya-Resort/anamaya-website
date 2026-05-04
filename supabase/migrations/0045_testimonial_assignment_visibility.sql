-- Per-(testimonial × category) visibility flag. When false, the
-- assignment row is hidden from the category's "Assigned to this
-- category" listing AND from the public Testimonials block — without
-- losing the excerpt/featured state, so toggling Visible back on
-- restores everything.

alter table public.testimonial_set_items
  add column if not exists is_visible boolean not null default true;

create index if not exists testimonial_set_items_visible_idx
  on public.testimonial_set_items(set_id, is_visible);

do $$
begin
  perform 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'testimonial_set_items'
    and column_name  = 'is_visible';
  if not found then
    raise exception 'testimonial_set_items.is_visible column failed to add';
  end if;
end $$;
