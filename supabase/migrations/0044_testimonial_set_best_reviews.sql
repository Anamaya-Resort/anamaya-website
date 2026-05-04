-- Adds the "Best Reviews" category. Empty for now — editor will
-- assign reviews to it via /admin/testimonials/sets/<id> just like
-- any other category.

insert into public.testimonial_sets (slug, name, description) values
  ('best_reviews', 'Best Reviews',
   'Hand-picked top testimonials curated for general use across the site')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description;
