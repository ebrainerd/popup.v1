# Marketing screenshots

Staged screenshots for seller-facing marketing (dashboard, sales, Studio, live shop).

## Quick start

```bash
# 1. Local Supabase must be running
supabase start

# 2. Seed demo seller + shops (always targets local stack)
MARKETING_SUPABASE_URL=http://127.0.0.1:54321 \
MARKETING_SUPABASE_SERVICE_ROLE_KEY=<from supabase status> \
node marketing/seed-demo.mjs

# 3. Capture screenshots (builds production bundle; create-shop uses dev server)
node marketing/capture-screenshots.mjs
```

Output: `marketing/screenshots/`

| File | Page |
|------|------|
| `dashboard.png` | `/dashboard` |
| `sales.png` | `/dashboard/sales` |
| `create-shop.png` | Shop Studio (`/dashboard/shops/{id}/setup`) |
| `live-shop.png` | Live buyer shop page |

## Demo account

- **Email:** `marketing@popupdrop.co`
- **Password:** `marketing-demo-2026`
- **Seller:** `@maya.clay` — ceramics creator with $468 gross sales, live drop, chat, sold-out products

Images live in `public/marketing/demo/` (reused claymation sell-step art + product photos).

## Notes

- Seed script always uses `MARKETING_SUPABASE_URL` (defaults to `http://127.0.0.1:54321`) so hosted env secrets don't leak into the wrong database.
- `NEXT_PUBLIC_MARKETING_DEMO=1` prefills `/dashboard/shops/new` for optional manual captures.
- Re-run seed anytime to reset demo data.
