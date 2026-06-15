---
name: edit-block
description: Fix or improve an existing website-builder block type (its rendering, options, or editor) without breaking pages already using it. Use when a collaborator wants to change how an existing block looks or behaves.
---

# Edit an existing block type

## Steps

1. **Identify the block** by its type slug. Find its three parts:
   - renderer: `src/components/blocks/<Name>Block.tsx`
   - editor: `src/app/admin/(default)/blocks/[id]/editors/<Name>Editor.tsx`
   - content type: in `src/types/blocks.ts`
2. **Stay backward-compatible.** Existing pages already store content for this
   block. Don't rename or remove existing fields; add new optional fields with
   sensible defaults so old blocks keep rendering. If a field must change
   shape, add a NEW migration to backfill — never edit an existing migration.
3. **Make the change** in the renderer and/or editor, matching surrounding
   style. Keep new options optional.
4. **Test:** check `/block-preview/<slug>`, then on the branch's deploy open a
   page that already uses this block in the builder and confirm nothing broke,
   plus that the new behavior works.
5. **Hand off:** summarize and tell the owner it's ready to review.

Never touch auth/config/migrations-that-already-ran. You're on a branch,
staging DB only.
