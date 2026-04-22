-- Register six new block types needed to rebuild the homepage as a
-- template. Code-side renderers + editors ship in the same commit.

insert into public.block_types (slug, name, description) values
  ('rich_bg',        'Rich Text w/ Background',
     'HTML content on a branded background (color, image or tile). Any inline HTML allowed.'),
  ('video_showcase', 'Video Showcase',
     'Embedded or uploaded video on a solid background with optional titles above and below.'),
  ('checklist',      'Checklist',
     'Heading + two rows of checklist items on a branded background.'),
  ('newsletter',     'Newsletter Signup',
     'Email-capture form with heading, description, input, and submit button.'),
  ('image_overlay',  'Image with Overlay Text',
     'Full-width image with up to three independently-styled lines of text on top.'),
  ('image_text',     'Image + Text Split',
     'Two-column layout: image on one side, free HTML on the other, with configurable split.')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description;
