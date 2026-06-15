---
name: new-page
description: Guidance for adding a new page to the site. Usually this is done in the builder admin, not in code — this skill routes the request correctly and only writes code when a page genuinely needs a custom React route.
---

# Add a new page

Most pages are **created in the builder admin**, not in code. Route the
request correctly:

1. **A normal content page** (text, images, blocks, a template) → create it in
   the builder admin (`/admin`), not here. Tell the owner that's the path —
   it's faster and doesn't need a deploy.
2. **A page that needs a new block** → run `new-block` first, then build the
   page in the builder.
3. **A bespoke, code-driven page** (custom interactivity the builder can't do,
   like the hand-built homepage / retreats pages) → continue below.

## If a custom React page is genuinely needed

1. Look at the existing hand-built pages under `src/app/(site)/` (e.g. the
   homepage `page.tsx`, `retreats/`) and mirror that structure.
2. Add the route under `src/app/(site)/<path>/page.tsx`.
3. If it must be reachable at a URL that the builder/proxy also knows about,
   note that for the owner — routing precedence lives in `src/proxy.ts`, which
   is owner-only (don't edit it).
4. Test on the branch deploy.
5. Hand off to the owner to review.

Branch only, staging DB only, no auth/config edits, never touch `proxy.ts`.
