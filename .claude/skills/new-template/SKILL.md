---
name: new-template
description: Create a new page template in the website builder (a reusable arrangement of blocks for a content type). Use when a collaborator wants a new layout that pages can be built from.
---

# Create a new page template

Templates are part of the builder. Most template work is **content/config done
in the admin** (`/admin` → Templates), NOT code. Only reach for code when the
template needs a capability the builder can't express yet.

## Decide first

- **If it's just arranging existing blocks** → do it in the builder admin
  (Templates), not here. Tell the owner that's the path.
- **If it needs a new block type** → run the `new-block` flow first, then use
  that block in the template.
- **If template rendering itself needs a code change** → continue below.

## If code is genuinely needed

1. Find how templates render — start at `src/components/templates/TemplateRenderer.tsx`
   and how `url_inventory.cms_template_id` pages use it.
2. Mirror the existing template-rendering pattern; add a NEW migration for any
   template registration/seed data (never edit an existing migration).
3. Test on the branch deploy by assigning a test page to the template in the
   builder.
4. Hand off to the owner to review.

Branch only, staging DB only, no auth/config edits.
