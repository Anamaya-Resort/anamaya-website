-- ============================================================
-- 0059: Reactions block type
--
-- LIKE / LOVE / MARRY affection widget for the bottom of an article/post
-- template. A brand-terracotta heart opens a 3-option modal; the reacted
-- state shows LIKED / LOVED / TRULY LOVED with a small/medium/large heart.
-- One vote per device. Records against whatever page path it is placed on
-- (read at runtime) via /api/reactions; the counts + love_score live in the
-- article_engagement view (migration 0056). Holds display settings only.
--
-- Fully idempotent.
-- ============================================================

insert into public.block_types (slug, name, description, is_overlay, is_active, sort_order)
values
  ('reactions', 'Reactions',
     'LIKE / LOVE / MARRY reaction heart for the bottom of an article or post template. One vote per device; the terracotta heart grows with the level (LIKED / LOVED / TRULY LOVED). Records against whatever page it is placed on; totals appear in the admin engagement view. Holds wording + spacing only.',
     false, true, 103)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      is_overlay = excluded.is_overlay,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order;

-- Seed one previewable instance so /block-preview/reactions works and the
-- 3 post templates have a block to reference.
insert into public.blocks (slug, type_slug, name, content)
values ('reactions_1', 'reactions', 'Article Reactions',
  '{"heading":"Enjoyed this story?","modal_question":"How do you feel about this post?","align":"center","padding_y_px":40}'::jsonb)
on conflict (slug) do nothing;
