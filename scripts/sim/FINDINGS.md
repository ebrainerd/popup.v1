# Local multi-user simulator — findings

**Date:** 2026-07-09  
**Branch:** `cursor/local-sim-battery-d74f`  
**Target:** local Supabase (`127.0.0.1:54321`) + local Next (`127.0.0.1:3000`)  
**Checkout mode:** seeded orders (Stripe test Connect accounts created; Checkout Session webhook path not driven end-to-end in this run)

## How to run

```bash
supabase start
supabase db reset   # wipe OK
# Next with local overrides (see AGENTS.md):
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon> \
SUPABASE_SERVICE_ROLE_KEY=<service> \
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 \
NEXT_PUBLIC_TURNSTILE_SITE_KEY= STRIPE_SECRET_KEY= \
RELEASE_DELAY_HOURS=0 CRON_SECRET=sim-cron-secret \
npm run dev

SIM_SITE_URL=http://127.0.0.1:3000 node scripts/sim/run.mjs phase1
SIM_SITE_URL=http://127.0.0.1:3000 node scripts/sim/run.mjs phase2
```

Safety rails refuse non-local Supabase/site URLs and live Stripe keys.

## Results (2026-07-09)

### Phase 1 — correctness (3 sellers / 12 buyers)

**PASS — 29/29** after P0 fix + harness fixes.

Covered:

- Stripe **test** Express Connect attach for 3 sellers
- Open shop: buy-now + auction → bid → finalize → paid → ship → confirm → rate
- Scheduled shop: 5 reminder subscriptions; cron auth OK
- Draft shop RLS: hidden from buyer/anon
- Buyer cannot insert orders; muted cannot chat; cannot rate unpaid
- Seller cannot bid own auction
- Stock never negative under double decrement

### Phase 2 — soak (20 concurrent bids)

**PASS — 5/5.** ~5/20 bids accepted under true concurrency (lower maxes correctly rejected as minimum rises); single winner; stock invariant held.

## Faults found

### P0 — fixed in this branch

| ID | Fault | Fix |
| -- | ----- | --- |
| **AUCTION-STOCK** | `decrement_stock` on an auction product set `quantity` to 0 while `sale_type='auction'`, violating `products_auction_fields_check`. Stripe webhook would 500 after capturing payment. | Migration `0029_auction_stock_decrement.sql`: for auction lots, clear auction fields + flip to `buy_now` then decrement. |

### P1 — harness / env (not product bugs)

| ID | Issue | Notes |
| -- | ----- | ----- |
| **CRON-HOST** | Using injected `NEXT_PUBLIC_SITE_URL` (hosted) caused cron 401 from the sim | Sim now forces `SIM_SITE_URL=http://127.0.0.1:3000` |
| **REMINDER-EMAIL** | Cron returned `{sent:0}` with no Resend | Expected: transactional email uses Resend, not Mailpit. Mailpit only sees Auth emails unless Resend is pointed at local SMTP. |
| **BID-RACE** | Not all concurrent max-bids succeed | Expected under proxy bidding; soak asserts winner + top-half success |

### Not exercised (follow-ups)

- Full Stripe Checkout Session → webhook → order (needs `stripe listen` + webhook secret)
- LiveKit multi-viewer soak
- Flash drops / anti-snipe extension under load
- Opening-reminder email body assertions with Resend → Mailpit bridge

## Artifacts

JSON/MD reports under `scripts/sim/artifacts/` (gitignored except `.gitkeep`).
