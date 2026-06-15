# Staging database setup (Step 2 of the collaborator system)

The website builder stores blocks, templates, and pages **in the database**.
So a separate **staging Supabase** is what lets partners (and their Claude
sessions) test builder changes — new block types, templates, content — without
ever touching the live site. This is the one piece that needs your Supabase
account; everything after it is scripted.

## What you do once (≈10 minutes)

1. **Create the project.** In the Supabase dashboard → New Project. Name it
   `anamaya-staging`, same region as production. Save the database password.
2. **Apply the schema.** Easiest path with the Supabase CLI (from this repo):
   - `supabase link --project-ref <STAGING_REF>` (the ref is in the staging
     project's URL / settings)
   - `supabase db push` — this applies every migration in `supabase/migrations/`
     to staging, recreating the exact builder schema + block types + templates.
   (If you'd rather not use the CLI, hand me the staging project ref + a
   Supabase access token and I'll apply the migrations for you.)
3. **Get the keys.** Staging project → Settings → API. Copy the Project URL and
   the `service_role` key.
4. **Add them to `.env.local`** (this file is git-ignored — never committed):

```
STAGING_SUPABASE_URL=https://<staging-ref>.supabase.co
STAGING_SUPABASE_SERVICE_ROLE_KEY=<staging service_role key>
```

## Then I run (one command)

```
npx tsx scripts/staging/clone-content.ts
```

This copies the live content (pages, retreats, snapshots, settings, redirects,
etc.) from production into staging so the sandbox mirrors the real site. It
only ever **writes to staging** and refuses to run if the staging URL looks
like production. Re-run it anytime to refresh staging from prod.

> Storage/images are **not** copied — frozen snapshots reference production's
> public asset URLs, which load fine from staging. Nothing to do there.

## How staging gets used

- **test.anamaya.com** and every collaborator **preview deployment** point their
  `SUPABASE_URL` at **staging**, not prod. (We wire this in Vercel's env per
  branch/environment — production env = prod DB, preview env = staging DB.)
- Collaborator Claude sessions (and the cc.anamaya.com portal) only ever get
  the **staging** keys — the guard hook also blocks any command referencing the
  production project ref.

## Security note

The staging `service_role` key is lower-value than production's, but it's still
a secret on a machine that's under the open malware incident. Prefer to add it
only when you're ready to run the clone, and rotate it later. Long-term, the
portal holds keys server-side in the cloud, not on this Mac.
