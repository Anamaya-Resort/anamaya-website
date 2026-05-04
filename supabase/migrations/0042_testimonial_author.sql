-- Add author (TripAdvisor reviewer handle / name) to testimonials.
-- The original spreadsheet import didn't include reviewer names; this
-- column lets editors fill them in manually so the public carousel
-- can show "<Name>, TripAdvisor · <date>" instead of generic
-- "TripAdvisor Review · <date>".

alter table public.testimonials
  add column if not exists author text;

-- Index isn't needed (we never filter by author).

do $$
begin
  perform 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'testimonials'
    and column_name  = 'author';
  if not found then
    raise exception 'testimonials.author column failed to add';
  end if;
end $$;
