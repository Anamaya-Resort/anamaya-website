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

## Setup left (need the owner) — everything runs on Vercel

Hosting plan: the website runs on **Vercel**; the AI runtime runs in a **Vercel
Sandbox** (isolated VM for the agent). **Cloudflare is not involved** — it stays
your DNS only. So there's **one credential**, not two.

1. **Shared AI key** — add `ANTHROPIC_API_KEY` (the single business key, same one
   AnamayOS uses) to the website's **Vercel** env, **not** committed. The tool
   flips from "Setup pending" to "Connected" automatically. (May already be set,
   since the site's other AI features read the same variable.)
2. **Runtime deps + wiring** — install `@vercel/sandbox` + the **Claude Agent
   SDK**, then wire the integration point marked in the route. Per session the
   sandbox:
   - checks out a fresh branch (never `main` / `production`),
   - points env at staging content, never the production ref
     `vytqdnwnqiqiwjhqctyi`,
   - loads this repo's `CLAUDE.md` + `.claude/skills` so Claude already knows
     the rules and the safe block/template flows,
   - streams progress back to the route above,
   - on "done", pushes the branch and returns a **preview link** for review.

## Why it's safe

- Gated twice (the `/admin` proxy gate + the API route check).
- Staging-only; the `.claude/` guardrails also hard-block any command touching
  the production ref, plus pushes, deploys, and edits to auth/SSO/proxy/scripts.
- Nothing goes live from here — collaborators hand off a branch; only the owner
  reviews and merges.
- Bookings/forms are external (Retreat Guru / Sereenly / GoHighLevel) and the
  rules forbid touching them.
