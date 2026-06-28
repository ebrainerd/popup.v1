# Production readiness

Living checklist for taking PopUp from “works when I click through it” to “ready
for a marketing campaign.” Pair this with `docs/DEPLOYMENT.md` (env wiring) and
`docs/MANUAL_TESTING.md` (feature walkthroughs).

**Current production URL:** see `docs/HANDOFF.md` (custom domain not wired yet).

---

## Launch gate (short version)

Do **not** run paid marketing until all of these are true:

- [ ] Custom domain live; `NEXT_PUBLIC_SITE_URL` and all OAuth/webhook URLs updated
- [ ] Resend domain verified; buyers/sellers receive order emails on your domain
- [ ] All Supabase migrations applied through latest (`0019`+ for native live)
- [ ] `CRON_SECRET` set; daily release-funds cron confirmed in Vercel logs
- [ ] Drop-reminder cron scheduled (Vercel Pro or external every-15-min trigger)
- [ ] Staging load test passed at **2× expected peak** (see [Load testing](#load-testing))
- [ ] One real dry-run drop with humans (seller + 10+ buyers) on staging or prod
- [ ] Sentry receiving errors; `/api/health` on uptime monitor

---

## Service upgrade checklist

### Must pay or upgrade before a real launch

| Service | Free / trial today | Production recommendation | Why it matters for PopUp |
| ------- | ------------------ | ------------------------- | ------------------------ |
| **Domain** | — | Buy + point DNS to Vercel | Trust, email deliverability, OAuth, Stripe webhooks |
| **Vercel** | Hobby | **Pro (~$20/mo)** strongly recommended | Hobby allows **one cron per day** only — drop reminders (`*/15 * * * *`) cannot deploy on Hobby; better headroom for traffic spikes |
| **Supabase** | Free | **Pro (~$25/mo)** for launch | Backups / PITR, higher DB + Storage + Realtime limits; free projects can pause when idle |
| **Resend** | 100 emails/day | **Paid** once volume grows | Order emails, drop reminders, live notifications; domain verification required |
| **LiveKit** | Free tier caps | **Paid** if native live is core to marketing | Concurrent viewers + egress limits during live drops |
| **Stripe** | No monthly fee | **Live mode** activated | Per-transaction fees only; Connect + identity verification required |

### Usually free — configure correctly

| Service | Cost | Production checklist |
| ------- | ---- | -------------------- |
| **Google OAuth** | Free | Publish consent screen to **Production**; add `<domain>/auth/callback` in Google Console + Supabase Auth |
| **Cloudflare Turnstile** | Free | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel **and** matching secret in Supabase → Auth → Captcha |
| **Sentry** | Free tier OK to start | `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN`; upgrade if you exceed free error quota |
| **GitHub Actions** | Free for small teams | Add `TEST_SUPABASE_*` secrets so RLS integration tests run in CI |

### Wiring (not a “plan upgrade” but required)

- [ ] **Custom domain** on Vercel
- [ ] `NEXT_PUBLIC_SITE_URL` → `https://yourdomain.com`
- [ ] **Supabase Auth** → Site URL + redirect URLs for new domain
- [ ] **Resend** → verify domain; `RESEND_FROM=YourBrand <orders@yourdomain.com>`
- [ ] **Supabase Auth SMTP** → Resend (built-in Supabase email is rate-limited)
- [ ] **Stripe live webhook** → `https://yourdomain.com/api/stripe/webhook`  
      Events: `checkout.session.completed`, `account.updated`, `checkout.session.expired`
- [ ] **Stripe Connect** branding URL → new domain
- [ ] **`CRON_SECRET`** in Vercel (cron routes fail closed without it)
- [ ] **`RELEASE_DELAY_HOURS=72`** in production (`0` is for testing only)
- [ ] **`PLATFORM_FEE_BPS=900`** (9%)
- [ ] **LiveKit** env on Vercel: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`, `NEXT_PUBLIC_LIVEKIT_URL`, `NATIVE_LIVE_ENABLED=true`
- [ ] **Turnstile** site key + Supabase captcha secret paired
- [ ] **Uptime monitor** on `GET /api/health`
- [ ] **Legal pages** reviewed (`/legal/terms`, `/legal/privacy`) — replace placeholder contacts
- [ ] **Migrations** applied in order through highest numbered file in `supabase/migrations/`

### Drop reminder cron (known gap on Hobby)

`/api/cron/send-drop-reminders` exists but is **not** in `vercel.json` on Hobby
because Vercel rejects sub-daily cron schedules on that plan.

Pick one:

1. **Vercel Pro** — add to `vercel.json`:
   `{ "path": "/api/cron/send-drop-reminders", "schedule": "*/15 * * * *" }`
2. **External scheduler** (e.g. cron-job.org) — every 15 min:
   `GET https://yourdomain.com/api/cron/send-drop-reminders?secret=<CRON_SECRET>`
3. **Daily best-effort only** — fold a limited pass into release-funds (opening
   reminders only; 1h/24h windows need sub-hour scheduling)

### Rough monthly minimum (excluding Stripe transaction fees)

| Item | Ballpark |
| ---- | -------- |
| Domain | ~$1–2/mo amortized |
| Vercel Pro | ~$20/mo |
| Supabase Pro | ~$25/mo |
| Resend | ~$0–20/mo (volume-dependent) |
| LiveKit | ~$0–50+/mo (viewer-dependent) |
| Sentry | $0 until you outgrow free |

---

## What breaks first under load

For a marketed drop, watch these bottlenecks:

1. **Supabase Realtime** — one channel per shop (chat, bids, flash, live state). Many viewers in one room hits connection limits on free tier.
2. **LiveKit** — concurrent subscribers during native live.
3. **Checkout** — inventory reservations + Stripe session creation during flash drops.
4. **Auction RPCs** — concurrent bids (correctness > raw RPS).
5. **Vercel serverless** — cold starts on checkout / webhook / cron paths.
6. **Resend** — rate limits if many reminders fire at once.

---

## Load testing

### Layers (recommended order)

| Layer | Tool | What it proves |
| ----- | ---- | -------------- |
| 1 | `npm run test` + `npm run test:e2e` | Unit logic + smoke routing (no real backend) |
| 2 | RLS suite on staging | `TEST_SUPABASE_*` → `test/integration/rls.test.ts` |
| 3 | k6 (below) | HTTP capacity: health, home, shop page |
| 4 | Human dry-run drop | Full seller + buyer flows with real Stripe test/live |

**“100 AI agents”** exploring every edge case is possible but usually **not**
the best first move — expensive, flaky, and poor at measuring concurrent load.
Use k6 for simulated users; use Playwright on staging for happy-path flows; use
humans for one real dress-rehearsal drop.

### k6 shop smoke script

Scripts live in `scripts/load/`. [k6](https://k6.io/docs/get-started/installation/)
is installed separately (not an npm dependency).

```bash
# Install k6 once (macOS example)
brew install k6

# Against production or staging — start conservative
BASE_URL=https://yourdomain.com \
SHOP_ID=<uuid-of-a-published-open-shop> \
k6 run scripts/load/shop-smoke.js
```

**Environment variables**

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `BASE_URL` | No (default `http://localhost:3000`) | Target origin |
| `SHOP_ID` | Recommended | Published shop UUID for `/shop/[id]` hits |
| `VUS` | No (default `30`) | Peak virtual users |
| `DURATION` | No (default `2m`) | Hold at peak VUs |

**Pass criteria (starting point)**

- `http_req_failed` &lt; 1%
- `p(95)` response time &lt; 3s on `/` and `/shop/[id]`
- No 5xx from your origin during the run

**Next steps after the smoke script**

- Add a checkout-session endpoint test only on **staging** with Stripe test keys
  (never load-test live payments).
- LiveKit and Supabase Realtime need separate soak tests (websocket clients);
  k6 alone does not stress those paths.

See `scripts/load/README.md` for copy-paste commands.

---

## Pre-marketing test sequence

### Config week

1. Domain + Resend + Supabase SMTP + Google OAuth production
2. Apply all migrations; verify cron + `CRON_SECRET`
3. Upgrade Vercel Pro if automated drop reminders matter
4. Upgrade Supabase Pro; confirm backups / PITR

### Test week

5. Wire RLS tests to staging in GitHub Actions
6. Add 5–10 Playwright flows on staging (signup → buy → ship)
7. k6: ramp to 2× expected peak on shop page
8. Friends-and-family drop on staging, then one small live prod drop

### Launch week

9. Monitor Sentry, Supabase dashboard, LiveKit dashboard, Stripe webhook logs
   during first public drop
10. Keep `NEXT_PUBLIC_DISCOVERY_MODE=invite_only` until you have enough scheduled
    supply for Explore (`marketplace` mode)

---

## Rebranding: PopUp → another name (e.g. DropShop)

**You do not need `popup.com`.** A domain like `dropshop.com` can host the
**PopUp** product — the brand name and the URL are independent. Most startups
launch on a descriptive domain while keeping an established product name.

If you **do** want to rename the app everywhere, difficulty depends on scope.

### Easy — a few hours (user-facing strings + config)

| Area | Effort | Notes |
| ---- | ------ | ----- |
| **Domain only** | Low | DNS → Vercel; update env vars (see `docs/DEPLOYMENT.md`). No code rename required. |
| **Next.js UI copy** | Low–medium | ~30–50 files: `layout.tsx` metadata, `logo.tsx`, marketing pages, emails in `src/lib/notifications.ts`, stream labels (`PopUp Live` → your name), legal pages. Mostly find-and-replace + design pass on logo. |
| **Email sender** | Low | `RESEND_FROM="DropShop <orders@dropshop.com>"` after domain verify |
| **OG / share text** | Low | `src/app/shop/[id]/page.tsx` metadata templates |

### Medium — half day (external dashboards)

| Service | What to update |
| ------- | -------------- |
| **Vercel** | Project name (cosmetic); production domain |
| **Supabase** | Auth email templates; Site URL (project URL stays `*.supabase.co`) |
| **Google OAuth** | App name, logo, privacy policy URL; may need re-verification if name changes significantly |
| **Stripe Connect** | Platform business name, support URL, webhook endpoint host |
| **Resend** | Domain + sender display name |
| **LiveKit** | Project display name (API keys unchanged) |
| **Sentry** | Project name (DSN can stay) |
| **Turnstile** | Widget label is in your UI, not Cloudflare |

### Hard / sticky — plan ahead or accept legacy strings

| Area | Why it’s sticky |
| ---- | --------------- |
| **`localStorage` keys** | `popup-new-shop-form`, `popup-shop-wizard:*`, etc. — changing keys logs users out of in-progress drafts |
| **npm / repo name** | `package.json` `"name": "popup"` — cosmetic for deploy; GitHub repo rename breaks clone URLs |
| **`/api/health`** | Returns `"service": "popup"` — monitors may key off this |
| **Stripe account** | Legal entity name on Connect account is separate from UI brand |
| **Already-sent emails** | Old links and branding in inboxes |
| **Google OAuth verification** | Large name/logo changes can trigger re-review |
| **Theme preset label** | `"Neon PopUp"` in `shop-theme.ts` — seller-visible |

### Recommended approach

1. **Launch on `dropshop.com` (or similar) keeping the PopUp brand** — fastest
   path to production readiness.
2. **Rebrand UI copy in one focused PR** when you settle on a final name — no
   service migrations required beyond email sender and OAuth display name.
3. **Avoid** renaming `localStorage` keys and internal package names unless you
   have a hard reason; they are invisible to users.

### Rebrand checklist (if you change the public name)

- [ ] `src/components/logo.tsx` + `src/app/layout.tsx` metadata
- [ ] `src/lib/notifications.ts` email subjects/bodies
- [ ] `src/lib/live-stream.ts` — `PopUp Live` label (or keep as product feature name)
- [ ] Marketing: `invite-only-home.tsx`, `sell/page.tsx`, `about/page.tsx`, legal pages
- [ ] `RESEND_FROM` display name
- [ ] Google OAuth consent screen
- [ ] Stripe Connect settings → business profile
- [ ] Update smoke e2e strings if taglines change (`e2e/smoke.spec.ts`)
- [ ] Run full `docs/MANUAL_TESTING.md` pass after rebrand PR

---

## Related docs

| Doc | Topic |
| --- | ----- |
| `docs/DEPLOYMENT.md` | Env vars, Supabase/Stripe setup, cron, Sentry |
| `docs/HANDOFF.md` | Current status, pending owner actions |
| `docs/MANUAL_TESTING.md` | Post-feature manual checklists |
| `docs/TESTING.md` | Unit, e2e, RLS integration tests |
| `scripts/load/README.md` | k6 install and run commands |
