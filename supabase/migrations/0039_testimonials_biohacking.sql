-- Adds the Biohacking category and assigns it to reviews that speak
-- to biohacking-adjacent experiences:
--   - Cold therapy (cold plunge, ice bath, infrared sauna)
--   - Breath work / breathing programming
--   - Anti-inflammatory + organic / gluten-free / dairy-free dietary protocols
--   - Energy/water healing modalities (Watsu, Reiki, Lomi Lomi)
--   - Cacao ceremony / dancing meditation / chakra work
--   - Ayurvedic teachings
--   - Restored sleep / nervous system recovery
--   - Deep transformative healing on the mind-body level
--
-- None of the 142 imported reviews used the word "biohacking" directly
-- (the term wasn't yet associated with retreat/wellness vocabulary at
-- the time most of these were written), so the assignments below were
-- selected by reading every review for biohacking-relevant practices
-- and pulling the strongest 1–2 sentence sound-bite for each.

-- 1. Add the new category. Idempotent so re-running is safe.
insert into public.testimonial_sets (slug, name, description) values
  ('biohacking', 'Biohacking',
   'Cold plunge / sauna / breath work / anti-inflammatory food / energy healing / restored sleep')
on conflict (slug) do nothing;

-- 2. Add the assignments + per-row biohacking-focused excerpts.
with assignments(slug, review_id, sort_order, excerpt) as (
  values
  ('biohacking', 'r1045214098', 0,
   'They have two huge shalas with ocean view, spa, cold plunge, pool, and a sauna — the entire stay felt easy and stress-free.'),

  ('biohacking', 'r984556540', 1,
   'There is also an infrared sauna and ice bath which are super for cold therapy days. You will feel nourished and fulfilled with the incredible, hearty meals they provide — they hit the jackpot on flavour and satisfaction every time.'),

  ('biohacking', 'r1041786160', 2,
   'The food, which is anti-inflammatory, is so delicious and will make you feel totally rejuvenated.'),

  ('biohacking', 'r1002851758', 3,
   'Joseph guided us through outstanding programming — including breath work that for me is life-changing.'),

  ('biohacking', 'r801808647', 4,
   'The staff made you feel like family, the food nourishes your body, the view and the yoga are amazing. I had a healing experience on a very deep level.'),

  ('biohacking', 'r663834649', 5,
   'I came out with an awesome new passion for yoga, meditation as a daily practice, healthier eating habits, and a new family of lifelong friends.'),

  ('biohacking', 'r658281196', 6,
   'Our yogi provided insightful yoga classes combined with Ayurvedic teachings that nurtured our bodies and souls. The food was farm fresh, organic, gluten free and absolutely delicious.'),

  ('biohacking', 'r644107017', 7,
   'I slept what is considered a healthy amount every night while there — I rarely get more than 4 hours unbroken sleep at home — so I returned feeling totally refreshed.'),

  ('biohacking', 'r797405924', 8,
   'Yoga twice a day, surfing classes, the cacao ceremony, osha meditation, a cooking demo, deep tissue massage, and a farm tour — it was all amazing and I loved every bit.'),

  ('biohacking', 'r751230341', 9,
   'Don''t miss the cacao ceremony and chakra workshops! The Lomi Lomi four-hands and Ashiatsu massage are the best I''ve ever experienced.'),

  ('biohacking', 'r687249642', 10,
   'Her cacao ceremony and dancing meditation set the bar high for anyone else I may experience that with — unforgettable and transformative experiences.'),

  ('biohacking', 'r543458293', 11,
   'Watsu is a once-in-a-lifetime experience of rebirth — Ana Laura uses the peaceful ocean to wash away old thoughts so you can explore new possibilities.'),

  ('biohacking', 'r539677522', 12,
   'For a most unique and transformative, nurturing experience, you must have a Watsu massage with Ana Laura — it will touch you to your core.'),

  ('biohacking', 'r497794287', 13,
   'I had the privilege of doing Watsu and Reiki — a very powerful experience that left me feeling deeply restored.'),

  ('biohacking', 'r534386948', 14,
   'I connected to nature in a different way than I ever have in my life. I came home a better person — such nourishing, healthy, stunning food.'),

  ('biohacking', 'r415799919', 15,
   'My stomach had never been happier than it was that one week. Anamaya is heaven on Earth — a place that is a feast for the mind, the heart, the senses, the body, and the soul.'),

  ('biohacking', 'r692261851', 16,
   'Watsu with Ana is a must do. It is done in a natural pool by the sea — a wonderful connection with nature, amazing food, warm people.'),

  ('biohacking', 'r476460505', 17,
   'Do the Watsu with Ana — it is life changing.')
)
insert into public.testimonial_set_items (set_id, testimonial_id, sort_order, excerpt)
select s.id, t.id, a.sort_order, a.excerpt
from assignments a
join public.testimonial_sets s on s.slug = a.slug
join public.testimonials t on t.review_id = a.review_id;

-- 3. Sharpen a handful of existing excerpts where the audit found
--    softer wording or referenced a one-off visiting teacher's name
--    in a way that didn't help the testimonial sell. Updates are by
--    (set_slug, review_id) so they target the exact (category × review)
--    row, not other category assignments of the same review.
update public.testimonial_set_items tsi
set excerpt = upd.new_excerpt
from (values
  -- #1 wellness — keep Diane (recurring staff) but make the lead pop
  ('wellness', 'r1052702616',
   'The spa services… I honestly couldn''t get enough. Spend some time with Diane — incredibly skilled, and it makes the experience that much more meaningful.'),
  -- #4 homepage — tighten to the single strongest line from a long review
  ('homepage', 'r1045214098',
   'I stayed at Anamaya in Montezuma, Costa Rica, and the overall experience was a dream from start to finish. Anamaya Resort has my heart.'),
  -- #100 homepage — sharpen the closer
  ('homepage', 'r641292400',
   'I never travel the same place twice but I would come back in a heartbeat. This is an incredibly perfect, wonderful, relaxing and adventurous place.'),
  -- #89 retreats — reframe so the daily-meditation outcome is the headline
  ('retreats', 'r663834649',
   'I came out with a new passion for yoga, meditation as a daily practice, healthier eating habits, and a new family of lifelong friends and connections.'),
  -- #114 ytt — move the headline up: "beyond excellent" is the punch
  ('ytt', 'r566061016',
   'I spent three weeks here taking the yoga teacher training, which was beyond excellent. The resort itself is utterly beautiful, set amongst nature but with a high level of luxury.')
) as upd(slug, review_id, new_excerpt)
where tsi.set_id = (select id from public.testimonial_sets where slug = upd.slug)
  and tsi.testimonial_id = (select id from public.testimonials where review_id = upd.review_id);

-- 4. Sanity check.
do $$
declare bio_cnt int; total_cnt int;
begin
  select count(*) into bio_cnt
  from public.testimonial_set_items tsi
  join public.testimonial_sets s on s.id = tsi.set_id
  where s.slug = 'biohacking';
  select count(*) into total_cnt from public.testimonial_set_items;
  raise notice 'Biohacking assignments: %; total assignments after 0039: %', bio_cnt, total_cnt;
end $$;
