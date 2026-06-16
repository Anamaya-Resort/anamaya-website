# AI Site Builder

A builder tool inside the website admin (**/admin/website/ai-site-builder**,
in the sidebar between Redirects and Settings). Staff describe a change in
plain language and Claude builds or modifies a block, template, or page — on a
branch the owner reviews before it goes live.

## Why it lives here

It's a website-builder tool, so it sits with the others (Blocks, Templates,
Redirects). `/admin` is already SSO-gated, so it inherits login for free — only
LightningWorks admins/superadmins can reach it. AnamayOS can deep-link to this
page; the same SSO means no second login (just a brief redirect the first time).

## What's built (testable today)

- The sidebar entry + page + chat UI (`AiSiteBuilderConsole.tsx`).
- `POST /api/admin/ai-site-builder/agent` — re-checks the admin session and,
  until the AI runtime is connected, returns a clear setup message so the tool
  is fully demoable now.

## The two setup steps left (need the owner)

1. **Shared AI key** — add `ANTHROPIC_API_KEY` (the single business key) to the
   website's server env (Vercel project env, **not** committed). The tool flips
   from "Setup pending" to "Connected" automatically.
2. **Sandbox runtime** — the piece that actually runs Claude against a branch.
   Recommended: **Cloudflare Sandbox SDK** running the **Claude Agent SDK**.
   Per session it:
   - checks out a fresh branch (never `main` / `production`),
   - points env at staging content, never the production ref
     `vytqdnwnqiqiwjhqctyi`,
   - loads this repo's `CLAUDE.md` + `.claude/skills` so Claude already knows
     the rules and the safe block/template flows,
   - streams progress back to the route above,
   - on "done", pushes the branch and returns a **preview link** for review.

   Wire it at the integration point marked in the route. Needs a **Cloudflare
   API token**.

## Why it's safe

- Gated twice (the `/admin` proxy gate + the API route check).
- Staging-only; the `.claude/` guardrails also hard-block any command touching
  the production ref, plus pushes, deploys, and edits to auth/SSO/proxy/scripts.
- Nothing goes live from here — collaborators hand off a branch; only the owner
  reviews and merges.
- Bookings/forms are external (Retreat Guru / Sereenly / GoHighLevel) and the
  rules forbid touching them.
