@AGENTS.md

# Anamaya website — collaborator rules

You are helping an Anamaya team member edit the Anamaya Resort marketing
website. Anamaya is a wellness / yoga retreat center on a clifftop in
Montezuma, Costa Rica — warm, calm, premium in tone. Follow these rules.
Several are also hard-enforced by `.claude/settings.json` + the guard hook;
if a tool call is blocked, that's why — don't try to work around it.

## The golden rules

1. **Never break booking or sign-ups.** Bookings run on Retreat Guru
   (`anamaya.secure.retreat.guru`) and forms on Sereenly / GoHighLevel
   (`link.sereenly.com`, `link.msgsndr.com`). These are external embeds and
   links. Do **not** "fix", rewrite, or remove them. If a task seems to
   require touching them, stop and ask the owner.
2. **You work on a branch, never on `production` or `main`.** You cannot push
   or merge to production — only the site owner reviews and goes live. Make
   your changes, then say you're done and hand off the branch.
3. **You are pointed at the STAGING database, never production.** Never use,
   request, or hard-code production database credentials, and never run the
   scripts in `scripts/` (they write to the live content DB).
4. **Don't deploy, don't touch DNS, don't bump versions, don't add
   dependencies** without the owner. No `vercel`, `wrangler`, `supabase db
   push`, or `git push`.

## Content vs. code — know which you're doing

The site has its own website builder (a WordPress-style block/template/page
system) whose **content lives in the database**, managed through the admin at
`/admin`. Code lives in this repo.

- **Editing content** (the words/images on a page, which blocks are on a
  page, arranging a template) → that's done in the **builder admin**, not
  here. If the owner wants content changed, point them there.
- **Editing the builder itself** (creating a new block *type*, a new
  template, fixing or improving an existing block's behavior or options) →
  that's **code**, and that's what you do here.

## How to add or change a block type (the common task)

A block type is not just a component — it has several pieces that must stay
in sync. **Copy an existing, similar block end-to-end** rather than inventing
the wiring. Good reference: the `three_column` block.

1. **Content type** — add/extend the block's shape in `src/types/blocks.ts`.
2. **Renderer** — `src/components/blocks/<Name>Block.tsx` (how it looks on the
   public site).
3. **Register it** — wire the new type into the block renderer/registry the
   same way the reference block is wired (e.g. `BlockRenderer.tsx`).
4. **Editor** — `src/app/admin/(default)/blocks/[id]/editors/<Name>Editor.tsx`
   (the admin form that edits this block's options).
5. **Migration** — add a **new** file in `supabase/migrations/` that registers
   the block type (follow the pattern in the existing `*_block.sql` files).
   **Never edit an existing migration** — always add a new one; old ones have
   already run and editing them does nothing (or causes drift).

Test the renderer in isolation at `/block-preview/<slug>`, then test it inside
the builder on your branch's preview deployment before handing off.

## Style & safety

- Match the surrounding code — naming, structure, comment density. This is
  **Next.js 16** (see `AGENTS.md`); read the local docs before using
  Next-specific APIs.
- Don't invent retreats, dates, prices, or testimonials. Use real content the
  owner provides or what's already in the system.
- Keep changes scoped to the task. Don't refactor unrelated code.
- Off-limits (you'll be blocked): auth/SSO, `proxy.ts`, `next.config.ts`,
  `.env*`, `src/app/api/auth`, the `scripts/` DB tooling, `package.json`
  dependencies, and the `.claude/` guardrails themselves.

## When you're done

Summarize what you changed, confirm you tested it on the branch preview, and
hand the branch to the owner to review and merge. Going live is always the
owner's call.
