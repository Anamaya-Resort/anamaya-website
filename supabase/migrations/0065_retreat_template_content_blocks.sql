-- ============================================================
-- 0065: Retreat template content blocks (Design A + Design B)
--
-- Real content for the Wild by Nature retreat (AnamayOS id
-- 5eb0a8e8-2467-4432-91d6-722101907c82), reusing existing block
-- types (image_overlay/rich_text/pricing_table/gallery/image_text/
-- checklist/cta_banner) plus the two new retreat_leader/retreat_rates
-- blocks from 0064. Idempotent.
-- ============================================================

insert into public.blocks (slug, type_slug, name, content) values (
  'hero_overlay_wbn_a', 'image_overlay', 'Hero — Wild by Nature (Editorial)', '{"image_url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/64f23082-a9a9-40d0-9619-85dcf9df650d/gallery/hero-image-83-6bb3879c.png", "image_alt": "Wild by Nature Retreat at Anamaya", "image_fit": "cover", "height_px": 560, "overlay_opacity": 35, "align": "center", "line_1": {"text": "Wild by Nature Retreat", "font": "heading", "size_px": 48, "color": "#ffffff", "bold": true}, "line_2": {"text": "with Angela Boltz", "font": "body", "size_px": 20, "color": "#ffffff"}}'::jsonb
) on conflict (slug) do nothing;

insert into public.blocks (slug, type_slug, name, content) values (
  'rich_text_wbn_desc', 'rich_text', 'Description — Wild by Nature', '{"html": "<p><strong>Wild by Nature. Refined by Design.</strong></p><p>Learn the Art of Truly Living \u2013 a jungle retreat at Anamaya, named one of National Geographic\u2019s Best Wellness Destinations for 2026.</p><p>This retreat is where you\u2019ll wake to howler monkeys, move through optional yoga classes and workshops on an open-air deck, and rediscover what it means to be fully awake inside your own life.</p><p>Each day opens a new doorway: body, rhythm, beauty, voice, ritual. You\u2019ll leave with your own Living Well Blueprint and something harder to name \u2013 a felt sense of how to savor the life already waiting for you.</p><p><strong>Spots are Limited. Reserve yours today.</strong></p>", "padding_y_px": 48}'::jsonb
) on conflict (slug) do nothing;

insert into public.blocks (slug, type_slug, name, content) values (
  'pricing_table_wbn_workshops', 'pricing_table', 'Workshops — Wild by Nature', '{"heading": "Optional Workshops", "intro": "Add-on sessions during your stay (space is limited, priced separately from the retreat).", "tiers": [{"name": "The Creative Life: Finding Your Medium", "price": "$50\u2013$100", "note": "90-minute workshop"}, {"name": "The Living Well Blueprint", "price": "$75\u2013$100", "note": "90-minute workshop"}], "padding_y_px": 32}'::jsonb
) on conflict (slug) do nothing;

insert into public.blocks (slug, type_slug, name, content) values (
  'gallery_wbn_a', 'gallery', 'Gallery — Wild by Nature (Grid)', '{"images": [{"url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/64f23082-a9a9-40d0-9619-85dcf9df650d/gallery/hero-image-83-6bb3879c.png", "alt": "Wild by Nature retreat at Anamaya"}, {"url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/ee6afaac-3f31-42b9-a5d4-feea52aa96e4/gallery/lower-deck-yoga-class-cropped-300x300-51700eee.png", "alt": "Wild by Nature retreat at Anamaya"}, {"url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/027a4a94-a39f-4421-9338-878953d743db/gallery/relax-on-the-pool-deck-at-anamaya-resort-300x300-87bae3ad.jpg", "alt": "Wild by Nature retreat at Anamaya"}, {"url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/027a4a94-a39f-4421-9338-878953d743db/gallery/spa-1-300x300-c701562a.jpg", "alt": "Wild by Nature retreat at Anamaya"}, {"url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/027a4a94-a39f-4421-9338-878953d743db/gallery/cristiane-link-300x300-c44147a2.jpg", "alt": "Wild by Nature retreat at Anamaya"}, {"url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/027a4a94-a39f-4421-9338-878953d743db/gallery/food-5-300x300-342b7e50.jpg", "alt": "Wild by Nature retreat at Anamaya"}], "layout": "grid", "columns": 3, "lightbox": true, "padding_y_px": 32}'::jsonb
) on conflict (slug) do nothing;

insert into public.blocks (slug, type_slug, name, content) values (
  'hero_overlay_wbn_b', 'image_overlay', 'Hero — Wild by Nature (Resort Card)', '{"image_url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/64f23082-a9a9-40d0-9619-85dcf9df650d/gallery/hero-image-83-6bb3879c.png", "image_alt": "Wild by Nature Retreat at Anamaya", "image_fit": "cover", "height_px": 640, "overlay_opacity": 45, "align": "center", "line_1": {"text": "Wild by Nature", "font": "heading", "size_px": 60, "color": "#ffffff", "bold": true}, "line_2": {"text": "Refined by Design \u2014 with Angela Boltz", "font": "body", "size_px": 20, "color": "#ffffff"}}'::jsonb
) on conflict (slug) do nothing;

insert into public.blocks (slug, type_slug, name, content) values (
  'image_text_wbn_story', 'image_text', 'Story — Wild by Nature', '{"image_url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/ee6afaac-3f31-42b9-a5d4-feea52aa96e4/gallery/lower-deck-yoga-class-cropped-300x300-51700eee.png", "image_alt": "Yoga class on the lower deck at Anamaya", "image_side": "left", "image_width_pct": 45, "html": "<p><strong>Wild by Nature. Refined by Design.</strong></p><p>Learn the Art of Truly Living \u2013 a jungle retreat at Anamaya, named one of National Geographic\u2019s Best Wellness Destinations for 2026.</p><p>This retreat is where you\u2019ll wake to howler monkeys, move through optional yoga classes and workshops on an open-air deck, and rediscover what it means to be fully awake inside your own life.</p><p>Each day opens a new doorway: body, rhythm, beauty, voice, ritual. You\u2019ll leave with your own Living Well Blueprint and something harder to name \u2013 a felt sense of how to savor the life already waiting for you.</p><p><strong>Spots are Limited. Reserve yours today.</strong></p>", "padding_y_px": 48}'::jsonb
) on conflict (slug) do nothing;

insert into public.blocks (slug, type_slug, name, content) values (
  'checklist_wbn_domains', 'checklist', 'What Each Day Explores — Wild by Nature', '{"heading": "Each Day Opens a New Doorway", "columns_top": [{"text": "Season"}, {"text": "Body"}, {"text": "Rhythm"}], "columns_bottom": [{"text": "Beauty"}, {"text": "Voice"}, {"text": "Ritual"}], "padding_y_px": 40}'::jsonb
) on conflict (slug) do nothing;

insert into public.blocks (slug, type_slug, name, content) values (
  'gallery_wbn_b', 'gallery', 'Gallery — Wild by Nature (Masonry)', '{"images": [{"url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/64f23082-a9a9-40d0-9619-85dcf9df650d/gallery/hero-image-83-6bb3879c.png", "alt": "Wild by Nature retreat at Anamaya"}, {"url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/ee6afaac-3f31-42b9-a5d4-feea52aa96e4/gallery/lower-deck-yoga-class-cropped-300x300-51700eee.png", "alt": "Wild by Nature retreat at Anamaya"}, {"url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/027a4a94-a39f-4421-9338-878953d743db/gallery/relax-on-the-pool-deck-at-anamaya-resort-300x300-87bae3ad.jpg", "alt": "Wild by Nature retreat at Anamaya"}, {"url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/027a4a94-a39f-4421-9338-878953d743db/gallery/spa-1-300x300-c701562a.jpg", "alt": "Wild by Nature retreat at Anamaya"}, {"url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/027a4a94-a39f-4421-9338-878953d743db/gallery/cristiane-link-300x300-c44147a2.jpg", "alt": "Wild by Nature retreat at Anamaya"}, {"url": "https://azvdmibriuqrmexwtrja.supabase.co/storage/v1/object/public/retreat-media/staging/027a4a94-a39f-4421-9338-878953d743db/gallery/food-5-300x300-342b7e50.jpg", "alt": "Wild by Nature retreat at Anamaya"}], "layout": "masonry", "columns": 4, "lightbox": true, "padding_y_px": 32}'::jsonb
) on conflict (slug) do nothing;

insert into public.blocks (slug, type_slug, name, content) values (
  'cta_banner_wbn', 'cta_banner', 'Final CTA — Wild by Nature', '{"heading": "Ready for Wild by Nature?", "subheading": "Spots are limited. Reserve yours today.", "bg_color": "anamaya-green", "cta": {"label": "Book Now", "href": "https://anamaya.secure.retreat.guru/program/wild-by-nature-yoga-retreat-angela-boltz/?form=1&lang=en"}}'::jsonb
) on conflict (slug) do nothing;
