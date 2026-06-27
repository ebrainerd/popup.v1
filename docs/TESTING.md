# Testing & CI

PopUp uses three layers of automated checks. CI runs the first two on every PR;
the RLS integration suite and full checkout flow need a real backend and are
opt-in.

## Layers

| Layer | Tool | Runs in CI | What it covers |
| ----- | ---- | ---------- | -------------- |
| Unit | Vitest | ✅ | Pure logic: fee math, shop-status, currency, embeds, profanity filter |
| Smoke e2e | Playwright | ✅ | Routing, SSR, auth guard, 404 — against a placeholder backend |
| RLS integration | Vitest | ⏭️ gated | Row Level Security guarantees against a real Supabase |

## Commands

```bash
npm run test          # unit tests (Vitest)
npm run test:watch    # unit tests in watch mode
npm run build         # required before e2e
npm run test:e2e      # Playwright smoke tests (starts the prod server)
```

First-time e2e setup: `npx playwright install --with-deps chromium`.

## Unit tests (`test/unit`)

Fast, no I/O. Server-only modules are importable because `server-only` is
aliased to a no-op stub in `vitest.config.ts`. Add tests here for any new pure
helper, especially anything touching money or time.

## Smoke e2e (`e2e/`)

Boots the built app with placeholder Supabase config and verifies public pages
render, the proxy redirects unauthenticated users away from `/dashboard`, and
unknown shops 404. No real services required.

## RLS integration tests (`test/integration/rls.test.ts`)

These prove the database enforces access control (draft shops hidden, non-owners
can't add products, muted users can't chat, ratings require completed orders).
They run against a **disposable** Supabase project with the migrations applied —
a local stack or a throwaway staging project, **never production**.

```bash
TEST_SUPABASE_URL=...                 \
TEST_SUPABASE_ANON_KEY=...            \
TEST_SUPABASE_SERVICE_ROLE_KEY=...    \
npx vitest run test/integration/rls.test.ts
```

Without those env vars the suite is skipped automatically.

## Full checkout flow (manual / staging)

See also **`docs/MANUAL_TESTING.md`** for feature-specific manual checklists (native
live streaming, etc.). Add a new section there whenever you ship user-facing work
that automated tests don't fully cover.

The end-to-end purchase flow requires Stripe test mode + a seeded shop, so it's
verified manually (or in a dedicated staging job) rather than in PR CI:

1. Apply all migrations; set Stripe test keys and `RELEASE_DELAY_HOURS=0`.
2. `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. Seller completes Connect onboarding → buyer checks out with `4242…` →
   seller marks shipped → buyer confirms receipt → buyer rates.

## Keeping types in sync

`src/lib/database.types.ts` is hand-maintained. Once a Supabase project is
linked, regenerate it to avoid drift:

```bash
npm run db:types   # supabase gen types typescript --linked > src/lib/database.types.ts
```
