# AGENTS.md

> **Read `docs/HANDOFF.md` first** for current project status, pending owner
> actions (e.g. custom-domain wiring), and conventions before starting work.

## Cursor Cloud specific instructions

PopUp is a single Next.js 16 (App Router) web app backed by a local Supabase
stack (Postgres + Auth + Storage + Realtime). There is one product/service to
run for development: the Next.js dev server, plus the Supabase stack it depends
on. Standard scripts live in `package.json` and are documented in `README.md`
and `docs/TESTING.md` — prefer those instead of duplicating commands here.

### Backend (Supabase) is required to run the app

The app's middleware (`src/proxy.ts` → `src/lib/env.ts`) throws on boot if
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing, so the
dev server returns 500s on every route without a configured backend. The local
Supabase stack provides these.

Startup (these are service-start steps, intentionally NOT in the update script):

1. Docker is installed in the VM but the daemon is not auto-started. Start it
   once per session: `sudo dockerd` (run it in a background tmux session). If the
   Supabase CLI later reports "permission denied ... docker.sock", run
   `sudo chmod 666 /var/run/docker.sock` (the `ubuntu` user is in the `docker`
   group, but a fresh login shell may not have picked up the group yet).
2. `supabase start` (first run pulls images; takes a few minutes). Keys are
   shown by `supabase status`.
3. `.env.local` must point at the local stack. Copy `.env.example` and set:
   - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the `ANON_KEY` from `supabase status`
   - `SUPABASE_SERVICE_ROLE_KEY` = the `SERVICE_ROLE_KEY` from `supabase status`
   The default local keys are deterministic across runs, so a committed-style
   `.env.local` keeps working after restarts.
4. `npm run dev` (Next.js dev server on http://localhost:3000).

### Non-obvious gotcha: injected Cloud secrets override `.env.local`

On a Cursor Cloud VM the agent environment injects the project's **hosted**
Supabase/Stripe secrets as real environment variables (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`,
`STRIPE_SECRET_KEY`; see `CLOUD_AGENT_INJECTED_SECRET_NAMES`). Next.js does **not**
let `.env.local` override variables that already exist in the real environment, so
`npm run dev` will talk to the **hosted** backend even though `.env.local` points at
the local stack. Pages still render, but authenticated flows break in confusing
ways — e.g. signup/login fail because the hosted project has Turnstile **captcha**
enabled (surfaced in the UI as "Sign-up is temporarily unavailable"), while a direct
`curl` to the local GoTrue at `http://127.0.0.1:54321/auth/v1/signup` succeeds.

To test auth or any write flow against the **local** stack, start the dev server with
explicit local overrides (real env vars beat `.env.local`, so pass them inline):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from `supabase status`> \
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY from `supabase status`> \
NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
NEXT_PUBLIC_TURNSTILE_SITE_KEY= STRIPE_SECRET_KEY= \
npm run dev
```

Local email signups are auto-confirmed and have no captcha, so signup logs you
straight into the dashboard.

### Non-obvious gotcha: table grants on the local stack

The SQL migrations enable Row Level Security and define policies, but they
assume the API roles (`anon` / `authenticated` / `service_role`) already hold
table-level privileges on the `public` schema — a hosted Supabase project
configures those default privileges at project creation, but a local CLI stack
does not. Without them every query fails with `permission denied for table ...`
(e.g. the Explore feed logs `getExploreShops error permission denied for table
shops`).

`supabase/seed.sql` re-grants the standard Supabase privileges and is applied
automatically by `supabase start` and `supabase db reset`. If you ever apply
migrations a different way (e.g. raw `psql`), re-run `supabase/seed.sql`
afterward. RLS stays enabled, so these grants do not weaken row-level access.

### Auth / data notes

- Local email signups are auto-confirmed (`enable_confirmations = false` in
  `supabase/config.toml`), so email/password signup logs you straight in — no
  inbox step. Mailpit (sent emails) is at http://127.0.0.1:54324 if needed.
- A DB trigger auto-creates a `profiles` row on signup.
- Google OAuth, Stripe, Resend email, and web push are all optional and no-op
  when their keys are blank; they are not needed for core local development.

### Tests

- `npm run test` (Vitest unit) and `npm run lint` / `npm run typecheck` need no
  backend.
- Playwright smoke tests (`npm run test:e2e`) require a production build first
  (`npm run build`) and a one-time `npx playwright install --with-deps chromium`.
- The gated RLS suite (`test/integration/rls.test.ts`) only runs when
  `TEST_SUPABASE_*` env vars are set, otherwise it auto-skips.

### Testing preference: skip manual GUI testing by default

Do **not** perform manual GUI testing (the `computerUse` subagent, screen
recordings, etc.) as a matter of course. Rely on `npm run typecheck`,
`npm run lint`, `npm run test`, and `npm run build` for verification. Only
spin up the browser / dev server for manual GUI testing when it is genuinely
necessary to validate a change (e.g. complex interactive UI behavior that
automated checks cannot cover), and prefer the lightest sufficient check.
