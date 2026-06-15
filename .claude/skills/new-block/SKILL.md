---
name: new-block
description: Create a new website-builder block TYPE (renderer + editor + registration + migration), following the existing block pattern. Use when a collaborator wants a new kind of content block available in the builder.
---

# Create a new block type

A block type spans several files that must stay in sync. Do NOT freehand the
wiring — mirror an existing, similar block exactly. Default reference:
`three_column` (see `supabase/migrations/0033_three_column_block.sql`,
`src/components/blocks/ThreeColumnBlock.tsx`, and its editor).

## Steps

1. **Confirm the need.** Ask what the block should show and which existing
   block is closest. Pick that as your reference block.
2. **Pick a slug + name.** Lowercase snake_case type slug (e.g.
   `testimonial_carousel`) and a human label. Check it's not already used in
   `src/types/blocks.ts` or the migrations.
3. **Content type:** add the block's content shape to `src/types/blocks.ts`,
   modeled on the reference block's type.
4. **Renderer:** create `src/components/blocks/<Name>Block.tsx` — the public
   rendering. Copy the reference renderer's structure, props, and styling
   conventions.
5. **Register:** wire the new type into the block renderer/registry the same
   way the reference block is (find where the reference type string is mapped
   to its component and add yours alongside).
6. **Editor:** create
   `src/app/admin/(default)/blocks/[id]/editors/<Name>Editor.tsx`, copying the
   reference editor so admins can configure every option.
7. **Migration:** add a NEW file `supabase/migrations/<nextNumber>_<slug>_block.sql`
   that registers the block type, following the existing `*_block.sql` files.
   Never edit an existing migration.
8. **Test:** preview the renderer at `/block-preview/<slug>`, then on the
   branch's deploy add the block to a test page in the builder and confirm the
   editor + rendering work.
9. **Hand off:** summarize the files touched and tell the owner it's ready to
   review.

Remember: you're on a branch and the staging database only. Never edit auth,
config, or existing migrations.
