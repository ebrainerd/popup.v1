# Local multi-user simulator (`scripts/sim/`)

Node ESM modules that seed and exercise PopUp against a **local Supabase stack only**.
Direct `@supabase/supabase-js` calls — no Next.js server actions.

## Safety rails (hard)

1. **`assertLocalOnly()`** — every client factory calls this. Non-`127.0.0.1` /
   `localhost` Supabase URLs throw immediately.
2. **`assertStripeTestOrSkip()`** — if `STRIPE_SECRET_KEY` is set it must be
   `sk_test_*`; otherwise checkout runs in **`seeded`** mode (orders inserted via
   service role, no live Stripe).
3. **Wipe-OK scope** — sim users use `@sim.popupdrop.local` emails and shared
   passwords (`sim-seller-pass` / `sim-buyer-pass`). Safe to `supabase db reset`
   between runs; never point at production.

Override URL/keys with `SIM_SUPABASE_*` env vars; defaults match
`marketing/seed-demo.mjs` deterministic local keys.

## Prerequisites

```bash
supabase start          # local stack at http://127.0.0.1:54321
cp .env.example .env.local   # optional; sim modules bring their own defaults
```

On Cursor Cloud, hosted Supabase secrets are injected into the shell. Sim modules
ignore those unless you set `SIM_SUPABASE_URL` — they always default to local.

## Modules (this commit)

| File | Role |
| ---- | ---- |
| `config.mjs` | Local URL/keys, passwords, `CRON_SECRET`, safety asserts |
| `clients.mjs` | `createAdmin()`, `createAnon()`, `signIn()` |
| `users.mjs` | `ensureUser()`, `sellerEmail(n)`, `buyerEmail(n)` |
| `shops.mjs` | `createShop()`, `createBuyNowProduct()`, `createAuctionProduct()` |
| `report.mjs` | `pass` / `fail` / `skip` findings → `artifacts/*.json` + `.md` |

## Phases (planned)

| Phase | Scope | Status |
| ----- | ----- | ------ |
| **0 — Core** | config, clients, users, shops, report | **this commit** |
| **1 — Wipe** | reset sim data (`@sim.popupdrop.local` users, shops, orders) | planned |
| **2 — Connect** | fake `stripe_account_id` for sellers | planned |
| **3 — Checkout** | buy-now + auction flows (seeded or `sk_test_`) | planned |
| **4 — Battery** | multi-user scenarios + cron hooks (`CRON_SECRET`) | planned |

Entry-point runners (`run-battery.mjs`, etc.) land in later commits.

## Example (manual, not wired yet)

```js
import { assertLocalOnly, assertStripeTestOrSkip } from "./config.mjs";
import { createAdmin } from "./clients.mjs";
import { ensureUser, sellerEmail } from "./users.mjs";
import { createShop, createBuyNowProduct } from "./shops.mjs";

assertLocalOnly();
const { checkoutMode } = assertStripeTestOrSkip();

const admin = createAdmin();
const seller = await ensureUser({
  email: sellerEmail(1),
  username: "seller01",
  displayName: "Sim Seller 01",
  isSeller: true,
});

const startAt = new Date(Date.now() + 60_000).toISOString();
const endAt = new Date(Date.now() + 3_600_000).toISOString();
const shopId = await createShop(admin, seller.id, {
  name: "Sim Drop 01",
  startAt,
  endAt,
  status: "open",
});

await createBuyNowProduct(admin, shopId, {
  title: "Test Mug",
  price: 2500,
  quantity: 5,
});

console.log({ checkoutMode, shopId });
```

## Artifacts

`report.writeReport("my-run")` writes:

- `scripts/sim/artifacts/my-run.json`
- `scripts/sim/artifacts/my-run.md`

Artifacts are gitignored except `.gitkeep`.
