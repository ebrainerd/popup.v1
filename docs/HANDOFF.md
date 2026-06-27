# PopUp — Project Handoff & Status

Living doc so anyone (human or agent) can pick up where we left off. Update it
as things change.

## What PopUp is

Time-boxed virtual pop-up shops. Sellers open shops that run on a schedule, go
live (YouTube/Twitch embed), run flash drops, and sell physical goods; buyers
discover public shops, follow creators, chat in "the room," and check out via
Stripe. Stack: **Next.js 16 (App Router) + Tailwind v4 + Supabase + Stripe + Vercel**.

## Where to look

| Topic | File |
| ----- | ---- |
| Run locally / scripts | `README.md` |
| Feature roadmap (M1–M3 done) | `docs/ROADMAP.md` |
| Creator-led drop loop PRD | `docs/CREATOR_DROP_LOOP.md` |
| Invite-only launch plan | `docs/INVITE_ONLY_LAUNCH_FIX_PLAN.md` |
| Live auctions PRD (shipped) | `docs/AUCTIONS_PRD.md` |
| Product UX review notes | `docs/PRODUCT_UX_REVIEW.md` |
| Testing & CI | `docs/TESTING.md` |
| Deploy, env vars, go-live checklist | `docs/DEPLOYMENT.md` |
| Cloud-agent run notes (Docker/Supabase) | `AGENTS.md` |
| DB schema | `supabase/migrations/*.sql` (apply in order) |

## Status (high level)

All three MVP milestones shipped and live in production, plus many post-launch
fixes/features: navigation pages, Explore sort + filters (incl. Following),
user/shop search, draft→publish flow, live-stream auto-display, inventory
reservations (no overselling), light/dark theme, detailed buyer order view,
and the full **order-email lifecycle** (purchase, shipped, unshipped reminder,
receipt nudge). **Invite-only launch mode** is the default (`NEXT_PUBLIC_DISCOVERY_MODE=invite_only`): homepage and nav are seller-led; Explore is hidden. Production runs in Stripe **live** mode.

Also shipped since: **multiple photos per product** with a scrollable gallery and
a clickable **product detail dialog**; a **$0.50 minimum price** (Stripe's minimum
chargeable amount, enforced on products/flash items/discounts/checkout); **HEIC
image uploads** (iPhone photos converted client-side via `src/lib/image-upload-client.ts`);
and **live auctions/bidding** (real-time bids; see `docs/AUCTIONS_PRD.md` and
`src/lib/auctions.ts` / `auction-bidding.ts`).

## ⚠️ Pending owner actions (do these when you can)

### Custom domain (NOT set up yet — currently on `popup-v1.vercel.app`)
This blocks real email delivery and is worth doing for branding/trust. Once a
custom domain is purchased and pointed at Vercel, update **all** of these:
- [ ] **Resend:** verify the domain, then set `RESEND_FROM` to an address on it
      (e.g. `PopUp <orders@yourdomain>`). **Until this is done, `RESEND_FROM` is
      `onboarding@resend.dev`, which only delivers email to the owner's own Resend
      account address — real buyers/sellers do NOT receive emails.**
- [ ] `NEXT_PUBLIC_SITE_URL` → the custom domain (used in emails, OG tags, redirects).
- [ ] **Supabase → Auth → URL Configuration:** Site URL + add `<domain>/auth/callback`.
- [ ] **Google OAuth** consent/client: add the production `<domain>/auth/callback` redirect.
- [ ] **Stripe:** update the webhook endpoint URL to `<domain>/api/stripe/webhook`
      and Connect branding URL.
- [ ] Redeploy.

### Other standing items
- [ ] Keep applying new DB migrations as they land (`supabase/migrations/`, in order).
      Latest applied should match the highest-numbered file — currently
      **`0013_auctions.sql`** (auctions require it; `0009` adds multi-photo, `0010`–`0012`
      cover the creator drop loop + invite-only launch).
- [ ] Stripe webhook must subscribe to: `checkout.session.completed`,
      `account.updated`, `checkout.session.expired`.
- [ ] Cron runs **daily** (Vercel Hobby limit) at `/api/cron/release-funds`; it
      releases held funds, frees expired checkout holds, sends ship reminders, and
      sends receipt nudges. On Vercel **Pro** you can increase the frequency.
- [ ] **Drop reminder cron not wired in Vercel yet.** The route
      `/api/cron/send-drop-reminders` exists and is idempotent, but it was
      removed from `vercel.json` because Vercel **Hobby only allows daily**
      cron schedules — a `*/15 * * * *` entry blocks deployment. Until this is
      fixed, opening-time reminders will not send automatically. Options:
      - Upgrade to Vercel **Pro** and add
        `{ "path": "/api/cron/send-drop-reminders", "schedule": "*/15 * * * *" }`
        back to `vercel.json`, or
      - Trigger manually / via Supabase scheduled function:
        `GET /api/cron/send-drop-reminders?secret=<CRON_SECRET>` (every 15 min
        in production), or
      - Fold a best-effort daily pass into `/api/cron/release-funds` (opening
        reminders only; 1h/24h windows need sub-hour scheduling).
      Apply migrations `0010_creator_drop_loop.sql`, `0011_invite_only_launch_fixes.sql`,
      and `0012_invite_only_launch_review_fixes.sql` before reminders work at all.
- [ ] **`NEXT_PUBLIC_DISCOVERY_MODE=invite_only`** is the production default. Set to
      `marketplace` only when there is enough scheduled supply to make Explore useful.
- [ ] **`CRON_SECRET` is required in production.** Cron routes fail closed without it.

## Email notifications (current behavior)

All emails are best-effort and **no-op without `RESEND_API_KEY`**:
- **Purchase** → buyer confirmation + seller new-sale (seller email includes the
  buyer's shipping address).
- **Mark shipped** (seller, manual + tracking) → buyer "it shipped" email with
  tracking link.
- **Unshipped > 3 days** → seller reminder (funds stay withheld until shipped).
- **Shipped, unconfirmed ~3 days** → buyer "did it arrive? confirm receipt" nudge
  (max 2, ~4 days apart). Tracked via `orders.receipt_nudge_count/_at`.
- **Drop reminders** (24h / 1h / opening) → buyer email (+ push if enabled) when
  cron is wired; see pending item above. Signup UI works regardless.

## Conventions for future agents

- Branch names: `cursor/<descriptive-name>-<suffix>`. One PR per logical change;
  open as draft; merge only when the user says so.
- Before pushing, run: `npm run typecheck && npm run lint && npm run test &&
  npm run build`, and `npm run test:e2e` for UI changes (build first).
- Env vars are documented in `docs/DEPLOYMENT.md` (full reference + checklist).
- Hand-maintained `src/lib/database.types.ts` mirrors the migrations — update it
  alongside any schema change (or regenerate via `npm run db:types`).
- Realtime: one Supabase channel per shop (`src/components/shop-room.tsx`) with
  presence + broadcast; use `emit` (not `broadcast`) when the sender's own UI
  must also update (Realtime doesn't echo to the sender).

## Known future work / ideas

- Native in-app live streaming (currently embeds only) — Phase 2; would integrate
  Amazon IVS / LiveKit / Mux. Tracked as item #7 in prior discussions.
- Scale hardening (Realtime connection limits, Explore caching, load testing).
- Carrier tracking API for real delivery ETAs (Shippo/EasyPost/AfterShip).
- Wire drop-reminder cron (see pending items above).
- Nonce-based strict CSP; per-viewer avatar stack in the room.
