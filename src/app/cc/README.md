# Collaborator Console (`/cc` → cc.anamaya.com)

A safe, in-house place for the two partners to work on the Anamaya website
**with Claude**, using the one shared business account — without being able to
break the live site, bookings, or the database.

## What's built (testable today)

- **`/cc`** — SSO-gated console. Only LightningWorks **admins/superadmins**
  get in (`layout.tsx` checks the session and bounces everyone else to the
  same `sso.lightningworks.io` login the rest of the site uses). Styled with
  the shared AnamayaOS brand tokens, so it matches AO automatically.
- **Chat UI** (`CollabConsole.tsx`) — describe a change, see the conversation.
- **`/api/cc/agent`** — backend endpoint. Re-checks the admin session
  (defense-in-depth) and, until the AI runtime is connected, returns a clear
  setup message so the whole thing is demoable now.

## The two setup steps left (need the owner)

The console works; the part that *does the work* needs two credentials and one
deploy. Neither is on this machine yet, on purpose.

1. **Shared AI key** — add `ANTHROPIC_API_KEY` (the single business key) to the
   server environment (Vercel project env for the `/cc` deploy, **not**
   committed). The console flips from "setup pending" to "live" automatically.
2. **Sandbox runtime** — the piece that actually runs Claude against a
   collaborator's branch. Recommended: **Cloudflare Sandbox SDK** running the
   **Claude Agent SDK**. For each session it:
   - checks out the repo on a fresh **per-partner branch** (never `main` /
     `production`),
   - sets the branch's env to the **staging** Supabase (`STAGING_SUPABASE_*`),
     never the production ref,
   - loads this repo's `CLAUDE.md` + `.claude/skills` so Claude already knows
     the rules and the safe block/template flows,
   - streams progress back to `/api/cc/agent`,
   - on "done", pushes the branch and returns a **preview deployment** link for
     the owner to review.

   Wire it at the integration point marked in `src/app/api/cc/agent/route.ts`.
   Needs a **Cloudflare API token** for deploy.

## Why it's safe

- **Auth**: gated twice (layout + API route) on the existing SSO admin check.
- **Staging-only**: collaborator sessions only ever get `STAGING_SUPABASE_*`.
  The `.claude/` guardrails (`settings.json` deny + `guard.mjs` hook) also
  hard-block any command referencing the production ref `vytqdnwnqiqiwjhqctyi`,
  plus pushes, deploys, and edits to auth/SSO/proxy/config/scripts.
- **No going live from here**: collaborators hand a branch off; only the owner
  reviews and merges to production.
- **Bookings/forms untouched**: those are external (Retreat Guru / Sereenly /
  GoHighLevel) and the rules forbid touching them.

## Mapping cc.anamaya.com → /cc

`/cc` lives inside this Next app, so it ships with every deploy. To serve it at
**cc.anamaya.com**:

- add `cc.anamaya.com` as a domain on the Vercel project, and
- (optional, edge-level gate) add `/cc` to the `proxy.ts` matcher alongside
  `/admin`. The layout already gates it, so this is belt-and-suspenders.

DNS for `cc` is a normal CNAME in Cloudflare — it does **not** touch the apex,
`www`, `MX`, or `ao` records, so it's independent of the main launch.
