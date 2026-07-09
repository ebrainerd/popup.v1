# Local multi-user simulator (`scripts/sim/`)

Node ESM modules that seed and exercise PopUp against a **local Supabase stack only**.
Direct `@supabase/supabase-js` calls — no Next.js server actions for core paths.

## Safety rails (hard)

1. **`assertLocalOnly()`** — refuses non-`127.0.0.1` / `localhost` Supabase URLs.
2. **`assertLocalSiteUrl()`** — cron/app probes use `SIM_SITE_URL` (default `http://127.0.0.1:3000`), never injected hosted `NEXT_PUBLIC_SITE_URL`.
3. **`assertStripeTestOrSkip()`** — `STRIPE_SECRET_KEY` must be `sk_test_*` or checkout runs in **seeded** mode.
4. **Wipe-OK** — users are `@sim.popupdrop.local`; safe to `supabase db reset`.

## Prerequisites

```bash
supabase start
supabase db reset   # applies migrations including 0029_auction_stock_decrement

# Local Next (required for cron probes)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon from supabase status> \
SUPABASE_SERVICE_ROLE_KEY=<service role> \
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 \
NEXT_PUBLIC_TURNSTILE_SITE_KEY= STRIPE_SECRET_KEY= \
RELEASE_DELAY_HOURS=0 CRON_SECRET=sim-cron-secret \
npm run dev
```

## Run

```bash
npm run sim:phase1          # correctness (3 sellers / 12 buyers)
npm run sim:phase2          # soak (20 concurrent bids)
npm run sim:all             # both
# or:
SIM_SITE_URL=http://127.0.0.1:3000 node scripts/sim/run.mjs all
```

Reports: `scripts/sim/artifacts/*.json` + `.md` (gitignored).  
Findings: **`scripts/sim/FINDINGS.md`**.

## Phases

| Phase | Scope | Status |
| ----- | ----- | ------ |
| **1 — Correctness** | RLS, auction win → ship → rate, buy-now, mute/chat, reminders cron auth, Connect attach | **PASS 29/29** |
| **2 — Soak** | 20 concurrent max-bids, single winner, stock invariant | **PASS 5/5** |

## Modules

| File | Role |
| ---- | ---- |
| `config.mjs` / `clients.mjs` / `users.mjs` / `shops.mjs` | Safety + seed primitives |
| `auctions.mjs` / `orders.mjs` / `chat.mjs` / `reminders.mjs` / `connect.mjs` | Drivers |
| `assertions.mjs` | RLS / invariant checks |
| `scenarios/phase1-correctness.mjs` | Correctness battery |
| `scenarios/phase2-soak.mjs` | Concurrent bid soak |
| `run.mjs` | CLI |

## Known product fix from this work

Migration **`0029_auction_stock_decrement.sql`**: auction checkout can decrement stock without violating `products_auction_fields_check` (was a P0 webhook failure mode).
