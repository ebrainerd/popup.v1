# Deployment & Environments

PopUp deploys on Vercel with Supabase + Stripe. Use three environments, each
with its **own** Supabase project and Stripe account/mode.

| Environment | Hosting | Supabase | Stripe | `NEXT_PUBLIC_APP_ENV` |
| ----------- | ------- | -------- | ------ | --------------------- |
| Local | `npm run dev` | local CLI or a dev project | test mode | `development` |
| Staging | Vercel Preview (PRs) | dedicated staging project | test mode | `staging` |
| Production | Vercel Production (`main`) | production project | live mode | `production` |

Never point staging/CI at the production database.

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

## 3. Scheduled payouts (cron)

`vercel.json` registers a **daily** cron hitting `/api/cron/release-funds`,
which releases funds for orders past their hold window. Set `CRON_SECRET`;
Vercel automatically sends it as a bearer token, and the route rejects
unauthorized calls. To run it elsewhere, `GET /api/cron/release-funds?secret=<CRON_SECRET>`.

> **Plan note:** Vercel's **Hobby** plan only allows **once-per-day** cron
> schedules and will fail the deployment if the schedule is more frequent. The
> default `0 5 * * *` (daily 05:00 UTC) works on Hobby. On **Pro** you can
> increase the frequency (e.g. hourly `0 * * * *`) for faster payouts — with a
> 72h hold, a daily run releases funds within ~72–96h, which is fine for MVP.

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

## Pre-launch checklist

- [ ] Production Supabase migrated; RLS verified (run the integration suite against staging)
- [ ] Google OAuth redirect URLs set for the production domain
- [ ] Stripe **live** keys + webhook configured; Connect enabled
- [ ] `RELEASE_DELAY_HOURS=72`, `PLATFORM_FEE_BPS=900`, `CRON_SECRET` set
- [ ] Cron confirmed running (check `/api/cron/release-funds` logs)
- [ ] Sentry DSNs set; a test error appears in the dashboard
- [ ] `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_ENV` correct for prod
- [ ] VAPID + Resend keys set (or notifications intentionally disabled)
- [ ] CI green on `main`
