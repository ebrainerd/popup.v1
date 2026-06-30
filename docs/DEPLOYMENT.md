# Deployment & Environments

PopUp deploys on Vercel with Supabase + Stripe. Use three environments, each
with its **own** Supabase project and Stripe account/mode.

| Environment | Hosting | Supabase | Stripe | `NEXT_PUBLIC_APP_ENV` |
| ----------- | ------- | -------- | ------ | --------------------- |
| Local | `npm run dev` | local CLI or a dev project | test mode | `development` |
| Staging | Vercel Preview (PRs) | dedicated staging project | test mode | `staging` |
| Production | Vercel Production (`main`) | production project | live mode | `production` |

Never point staging/CI at the production database.

## Environment variables reference

Set these in **Vercel → Settings → Environment Variables** (scope **Production**,
and **Preview** for staging). `NEXT_PUBLIC_*` values are exposed to the browser;
all others are server-only secrets. After adding/changing any, **redeploy**.

> Note: the Turnstile **secret** and the Stripe webhook signing secret are entered
> in Supabase/Stripe respectively — only the keys below go in Vercel.

### Required — core app

| Variable | Where to get it | Example |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | `https://abcd.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` `public` key | `eyJ…` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` secret | `eyJ…` |
| `NEXT_PUBLIC_SITE_URL` | Your deployed URL (full, **with** scheme) | `https://www.popupdrop.co` |
| `NEXT_PUBLIC_DISCOVERY_MODE` | Launch mode: `invite_only` (default) or `marketplace` | `invite_only` |
| `CRON_SECRET` | Random secret for `/api/cron/*` routes (required in production) | `openssl rand -hex 32` |

### Required — payments (test now, live after Stripe approval)

| Variable | Where to get it | Example |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (secret) | `sk_test_…` / `sk_live_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys (publishable) | `pk_test_…` / `pk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → your endpoint → signing secret | `whsec_…` |
| `PLATFORM_FEE_BPS` | Platform commission, basis points (9% = 900) | `900` |
| `RELEASE_DELAY_HOURS` | Payout hold after shipping. `0` for testing, `72` in prod | `72` |

### Recommended

| Variable | Where to get it | Example |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_ENV` | Environment label for monitoring | `production` |
| `SENTRY_DSN` | Sentry → Project → Client Keys (DSN) | `https://…@o…ingest.sentry.io/…` |
| `NEXT_PUBLIC_SENTRY_DSN` | Same DSN value (browser) | `https://…@o…ingest.sentry.io/…` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile → site key (secret goes in Supabase) | `0x4AAAA…` |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | `openssl rand -base64 32` — **build-time** secret so Server Action IDs stay stable across deploys and server instances | `…` |

### Optional — notifications

| Variable | Where to get it | Example |
| --- | --- | --- |
| `RESEND_API_KEY` | Resend → API Keys | `re_…` |
| `RESEND_FROM` | A verified sender | `PopUp <hello@yourdomain>` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` | `B…` |
| `VAPID_PRIVATE_KEY` | from the same command | `…` |
| `VAPID_SUBJECT` | contact mailto/URL | `mailto:hello@yourdomain` |

### Configured outside Vercel

| Setting | Where | Purpose |
| --- | --- | --- |
| Turnstile **secret** key | Supabase → Authentication → Captcha | Server-side captcha verification |
| Stripe webhook events | Stripe → Webhooks | `checkout.session.completed`, `account.updated` |
| Google OAuth client ID/secret | Supabase → Authentication → Providers → Google | Google sign-in |
| `TEST_SUPABASE_URL` / `TEST_SUPABASE_ANON_KEY` / `TEST_SUPABASE_SERVICE_ROLE_KEY` | GitHub → Settings → Secrets → Actions | Run the RLS suite in CI against staging |

### Copy-paste checklist (Vercel Production)

```
# Required
[ ] NEXT_PUBLIC_SUPABASE_URL
[ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
[ ] SUPABASE_SERVICE_ROLE_KEY
[ ] NEXT_PUBLIC_SITE_URL
[ ] NEXT_PUBLIC_DISCOVERY_MODE=invite_only
[ ] CRON_SECRET
[ ] STRIPE_SECRET_KEY
[ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
[ ] STRIPE_WEBHOOK_SECRET
[ ] PLATFORM_FEE_BPS=900
[ ] RELEASE_DELAY_HOURS=72        # use 0 while testing
# Recommended
[ ] NEXT_PUBLIC_APP_ENV=production
[ ] SENTRY_DSN
[ ] NEXT_PUBLIC_SENTRY_DSN
[ ] NEXT_PUBLIC_TURNSTILE_SITE_KEY
[ ] NEXT_SERVER_ACTIONS_ENCRYPTION_KEY   # openssl rand -base64 32; redeploy after set
# Optional (notifications)
[ ] RESEND_API_KEY
[ ] RESEND_FROM
[ ] NEXT_PUBLIC_VAPID_PUBLIC_KEY
[ ] VAPID_PRIVATE_KEY
[ ] VAPID_SUBJECT
```

## 1. Supabase (per environment)

1. Create the project; copy URL + anon + service-role keys.
2. Apply migrations (in order) from `supabase/migrations/` — via the SQL editor,
   or with the CLI:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
3. **Auth → Providers:** enable Google; add `<SITE_URL>/auth/callback` as a
   redirect. **Auth → URL Configuration:** set the Site URL and redirect URLs.
4. After linking, regenerate types to prevent drift: `npm run db:types`.

## 2. Stripe (per environment)

1. Use **test** keys for staging, **live** keys for production.
2. Enable **Connect** (Express accounts) in the Stripe dashboard.
3. Add a webhook endpoint → `https://<host>/api/stripe/webhook`, subscribed to:
   - `checkout.session.completed`
   - `account.updated`
   Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Set `PLATFORM_FEE_BPS=900` (9%) and `RELEASE_DELAY_HOURS` (72 in prod; `0`
   locally for instant payouts when testing).

## 3. Scheduled jobs (cron)

`vercel.json` registers a **daily** cron hitting `/api/cron/release-funds`,
which releases funds for orders past their hold window. **`CRON_SECRET` is
required in production** — cron routes return 500 if it is missing and 401 on bad
tokens. Set the same secret for both `/api/cron/release-funds` and
`/api/cron/send-drop-reminders`. Vercel automatically sends it as a bearer token,
and the route rejects unauthorized calls. To run it elsewhere,
`GET /api/cron/release-funds?secret=<CRON_SECRET>`.

> **Plan note:** Vercel's **Hobby** plan only allows **once-per-day** cron
> schedules and will fail the deployment if the schedule is more frequent. The
> default `0 5 * * *` (daily 05:00 UTC) works on Hobby and runs **release-funds**
> only. **`/api/cron/send-drop-reminders` is not wired in `vercel.json` on Hobby**
> — drop reminders need an external scheduler (e.g. cron-job.org) or a **Pro**
> cron if you want automated reminder delivery. On **Pro** you can increase
> release-funds frequency (e.g. hourly `0 * * * *`) for faster payouts — with a
> 72h hold, a daily run releases funds within ~72–96h, which is fine for MVP.

### External scheduler for drop opening reminders (Vercel Hobby)

PopUp has two reminder systems:

| Feature | How it fires | Cron needed? |
| ------- | ------------ | ------------ |
| **Notify me when live** (`live_reminders`) | Instantly when the seller goes live | No |
| **Remind me** before shop opens (`drop_reminders`) | 24h / 1h / at opening windows | Yes — every **15 minutes** |

On Hobby, wire drop reminders with [cron-job.org](https://cron-job.org) (free tier is fine):

1. Create an account and **Create cronjob**
2. **Title:** PopUp drop reminders
3. **URL:**
   ```
   https://www.popupdrop.co/api/cron/send-drop-reminders?secret=YOUR_CRON_SECRET
   ```
   Replace `YOUR_CRON_SECRET` with the same value as `CRON_SECRET` in Vercel.
4. **Schedule:** every 15 minutes (`*/15 * * * *` or the UI equivalent)
5. **Request method:** GET
6. Save and enable the job

Verify: after the first run, cron-job.org should show HTTP **200** and a body like `{"sent":0}` (or a positive count when reminders are due). Check **Resend → Logs** when a shop has an upcoming `start_at`.

## 4. Error monitoring (Sentry)

Set `SENTRY_DSN` (server) and `NEXT_PUBLIC_SENTRY_DSN` (browser) plus
`NEXT_PUBLIC_APP_ENV`. With no DSN the SDK is a no-op, so deploys work before
Sentry is set up. Server/edge/client are instrumented, and the Stripe webhook,
payout release, and notification paths report exceptions with tags.
(Source-map upload via `withSentryConfig` + an auth token is a later add-on.)

## 5. Vercel project settings

- Framework preset: Next.js. Build: `next build` (default).
- Add all env vars from `.env.example` to **Production** and **Preview** scopes
  (with the right values per environment).
- Production deploys from `main`; PRs get Preview deployments (staging).

## 6. CI secrets (GitHub → Settings → Secrets → Actions)

To run the RLS integration suite against staging in CI, add:
`TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY`
(point them at the **staging** project). Until then the suite auto-skips.

## Production hardening (beyond basic wiring)

These take the app from "deployed" to "ready for real users and real money."

### Stripe (live)
- [ ] **Enable Connect** on the platform account (marketplace / "you collect and pay
      recipients" model — matches the separate charges & transfers code). Required or
      "Set up payouts" fails (handled gracefully, but onboarding won't complete).
- [ ] After live-account approval: switch Vercel to **live** keys (`sk_live_…`,
      `pk_live_…`), create a **live-mode** webhook, set its `STRIPE_WEBHOOK_SECRET`,
      set `RELEASE_DELAY_HOURS=72`.

### Auth (Supabase)
- [ ] Turn **Email → Confirm email = ON** for production (the signup flow already
      handles the "check your email" state).
- [ ] Configure a **custom SMTP** (e.g. Resend) under Auth → SMTP — the built-in
      email is heavily rate-limited and not for production.
- [ ] Enable **leaked-password protection** (Auth → Passwords) and consider a
      **CAPTCHA** (hCaptcha/Turnstile) on signup to deter bots.
- [ ] **Google OAuth:** publish the consent screen to **Production** (External), and
      add the production `…/auth/callback` redirect.
- [ ] **Turnstile hostnames:** Cloudflare dashboard → Turnstile → your widget →
      **Hostname Management** → add **`popupdrop.co`** and **`www.popupdrop.co`**
      (both — adding only `www` does **not** cover the apex). Error **110200** means
      the current domain is missing from this list.

### Secrets / config
- [ ] Set **`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`** in Vercel (generate once with
      `openssl rand -base64 32`). Must be present at **build time** so Server Action
      IDs do not rotate unpredictably across deploys. After a deploy, users on stale
      cached JS may see `UnrecognizedActionError` until they reload; the service worker
      no longer caches HTML/`/_next/` assets, and the app auto-reloads once on that error.
- [ ] Set **`CRON_SECRET`** in Vercel (required — cron routes fail closed without it).
- [ ] Set **Sentry** DSNs (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`) so errors are
      actually captured (no-ops until set).
- [ ] Set **VAPID** + **Resend** keys if you want web-push / email notifications.

### Domain & infra
- [x] **Custom domain** on Vercel (`popupdrop.co`); `NEXT_PUBLIC_SITE_URL`,
      Supabase Auth URLs, Stripe webhook, and Connect branding updated. Redeployed.
- [ ] Confirm **CI is green** (Actions runners require a verified GitHub account).
- [x] **Uptime monitoring** on `/api/health`.
- [ ] Review **Supabase backups** / plan (PITR on Pro) for the production project.

### App
- [ ] Security headers are set in `next.config.ts`. A strict **CSP** is intentionally
      deferred (must allow Supabase REST+realtime, Stripe, YouTube/Twitch, Sentry) —
      add and test separately.
- [ ] **Review the legal templates** at `/legal/terms` and `/legal/privacy` with
      counsel and replace the placeholder contact addresses.
- [ ] Run the RLS integration suite against staging (add `TEST_SUPABASE_*` CI secrets).

## Pre-launch checklist

Walk **`docs/PRE_MARKETING_TEST.md`** for the full manual pass. Infrastructure:

- [x] Production Supabase migrated through `0020`; RLS verified locally / staging
- [x] Google OAuth redirect URLs set for `https://www.popupdrop.co`
- [x] Stripe **live** keys + webhook configured; Connect enabled
- [ ] Confirm `RELEASE_DELAY_HOURS=72`, `PLATFORM_FEE_BPS=900`, `CRON_SECRET` in Vercel
- [x] Daily `release-funds` cron; drop reminders via cron-job.org every 15 min
- [x] Sentry DSNs set
- [x] `NEXT_PUBLIC_SITE_URL=https://www.popupdrop.co` / `NEXT_PUBLIC_APP_ENV=production`
- [x] VAPID + Resend keys set
- [ ] CI green on `main`
- [ ] Two-person dry-run drop completed (`docs/PRE_MARKETING_TEST.md`)
