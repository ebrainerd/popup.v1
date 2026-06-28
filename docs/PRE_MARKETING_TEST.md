# Pre-marketing test plan

**Purpose:** A complete manual checklist for two people (one seller, one buyer) to
walk every PopUp feature on production before paid marketing. Work through it
section by section, record pass/fail, and fix bugs before launch.

**Production site:** https://www.popupdrop.co  
**Current launch mode:** `invite_only` (shops are link-only; Explore is a holding page)

**Pair with:**

| Doc | Use for |
| --- | ----- |
| `docs/MANUAL_TESTING.md` | Deep native-live streaming steps (subset of §8 below) |
| `docs/PRODUCTION_READINESS.md` | Infrastructure launch gate + load testing |
| `docs/DEPLOYMENT.md` | Env vars, cron URLs, Stripe/Resend setup |
| `docs/HANDOFF.md` | Current project status |

---

## How to use this document

### Roles

| Role | Person | Accounts needed |
| ---- | ------ | ----------------- |
| **Seller** | Person A (you) | New or existing seller account; Stripe Connect onboarding |
| **Buyer** | Person B (partner) | Separate email — do **not** share the seller login |
| **Observer** | Optional third device | Logged-out browser or incognito for anonymous views |

Use **two browsers** (or one normal + one incognito) so seller and buyer sessions
stay separate.

### Recording results

For each numbered step, mark:

- ✅ Pass
- ❌ Fail — note what happened vs. expected; file a bug or fix before marketing
- ⏭️ Skip — only if the feature is intentionally disabled (note why)

Copy this table at the top of your test session notes:

```text
Date: ___________
Tester(s): ___________
Shop URL tested: ___________
Browser(s): Chrome / Safari / Firefox / Mobile: ___________

Section | Step | Result | Notes
--------|------|--------|------
```

### Important warnings

1. **Stripe is in live mode** — real money moves on every purchase. Use a
   low-priced test product ($0.50 minimum) and a card you control. Refund via
   Stripe Dashboard if needed.
2. **`RELEASE_DELAY_HOURS=72` in production** — seller payouts release ~72 hours
   after marking shipped. Do not lower this on prod for testing; use the manual
   cron only if you need to verify release logic (see §18).
3. **Email** — order and reminder emails only deliver to real inboxes when
   Resend is configured with a verified domain (`orders@popupdrop.co` or similar).
   Check both buyer and seller inboxes (and spam).
4. **Invite-only mode** — buyers reach shops via **direct link**, not Explore.
   Test sharing/copy-link flows; do not expect the shop to appear on `/explore`.

---

## Phase 0 — Site health (5 min)

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 0.1 | Open https://www.popupdrop.co | Home loads; no 500 errors | |
| 0.2 | Open https://www.popupdrop.co/api/health | JSON `{ "ok": true, "service": "popup" }` | |
| 0.3 | Open `/sell`, `/about`, `/legal/terms`, `/legal/privacy` | All pages render; legal contact shows `legal@popupdrop.co` | |
| 0.4 | Toggle light/dark theme (header) | Theme persists on refresh | |
| 0.5 | Open `/explore` | Holding page (invite-only), not a full feed | |
| 0.6 | Open `/search` | Redirects to `/sell` (invite-only) | |
| 0.7 | Open `/robots.txt` and `/sitemap.xml` | Robots disallows dashboard; sitemap lists marketing routes | |

**Automated smoke (optional, seller runs once):**

```bash
npm run load:shop-smoke -- https://www.popupdrop.co/shop/<published-shop-uuid>
```

Pass criteria: `http_req_failed` 0%, p95 under 3s. See `scripts/load/README.md`.

---

## Phase 1 — Authentication (20 min)

Test on **both** seller and buyer accounts.

### Sign up

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 1.1 | Buyer: `/signup` → email + password (8+ chars) | Account created; logged in; redirected to dashboard or home | |
| 1.2 | Seller: `/signup` with Google OAuth | Google consent shows **PopUp**; returns to site logged in | |
| 1.3 | Sign up with weak password (< 8 chars) | Validation error; no account | |
| 1.4 | Sign up with email already in use | Clear error | |
| 1.5 | Cloudflare Turnstile widget visible on login/signup | Completes without error | |

### Log in / log out

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 1.6 | `/login` with wrong password | Error message; no session | |
| 1.7 | `/login` with correct credentials | Logged in | |
| 1.8 | User menu → Sign out | Session cleared; protected routes redirect to login | |
| 1.9 | Visit `/orders` while logged out | Redirect to `/login?redirectTo=/orders` | |
| 1.10 | Log in from that redirect | Lands on `/orders` after auth | |

### Profile

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 1.11 | Complete profile / username if prompted | Username appears in nav; `/u/[username]` resolves | |
| 1.12 | Visit own public profile `/u/[username]` | Bio editable for owner; follower count visible | |

---

## Phase 2 — Legal & seller terms gate (10 min)

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 2.1 | Read `/legal/terms` | California law, Los Angeles County venue, `legal@popupdrop.co` | |
| 2.2 | Read `/legal/privacy` | Data practices; contact email | |
| 2.3 | Seller (first time): `/dashboard/shops/new` | Full-screen **Seller Terms** dialog | |
| 2.4 | Try **Acknowledge** without scrolling | Button disabled | |
| 2.5 | Scroll to bottom → **Acknowledge** | Wizard opens; acceptance stored | |
| 2.6 | Leave and return to **Create shop** | Wizard opens directly (no second prompt) | |
| 2.7 | Footer links to Terms and Privacy from any page | Links work | |

---

## Phase 3 — Seller: create shop wizard (45 min)

Seller completes all five wizard steps. Save draft midway and resume once.

### Step 1 — Details

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 3.1 | Enter shop name, description | Fields save | |
| 3.2 | Upload cover image (JPEG/PNG) | Preview shows; uploads to storage | |
| 3.3 | Upload HEIC photo (iPhone) if available | Converts and uploads | |
| 3.4 | Set visibility | In invite-only mode, only **Link-only** available | |
| 3.5 | **Save draft** → leave wizard → resume via dashboard | Draft intact at `/dashboard/shops/[id]/setup` | |

### Step 2 — Products

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 3.6 | Add **Buy Now** product: name, price ≥ $0.50, shipping rate, inventory | Product listed in wizard | |
| 3.7 | Add multiple photos to one product | Gallery shows all images | |
| 3.8 | Add second product as **Auction** | Auction settings visible (starting bid, duration, etc.) | |
| 3.9 | Try price below $0.50 | Blocked with clear message | |
| 3.10 | Delete a product | Removed from list | |

### Step 3 — Layout & theme

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 3.11 | Try each theme preset (Neon PopUp, Gallery, Dark Room, Market Stall) | Preview updates | |
| 3.12 | Change layout mode, accent color, grid 2 vs 3 columns | Preview reflects changes | |
| 3.13 | Toggle sections: chat, seller bio, reminder CTA | Toggles persist | |

### Step 4 — Live stream

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 3.14 | **PopUp Live** selected by default | YouTube/Twitch fields hidden | |
| 3.15 | Switch to **YouTube or Twitch**, paste valid URL, switch back | Native mode restores | |
| 3.16 | Choose stream layout (classic, broadcast, countdown, catalog) | Selection saves | |

### Step 5 — Schedule

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 3.17 | Set `start_at` ~15–30 min in future, `end_at` ~2 hours later | Countdown shown on manage shop | |
| 3.18 | Finish wizard | Redirect to manage shop; status **Scheduled** | |

---

## Phase 4 — Seller: manage shop before open (20 min)

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 4.1 | Open **Launch checklist** on manage shop | Items: details, products, cover, stream, payouts, publish, share | |
| 4.2 | **Preview shop** (draft / scheduled) | Buyer page opens with **Draft preview** or scheduled state; purchases disabled for draft | |
| 4.3 | **Copy link** / share card | URL copies; share text reasonable | |
| 4.4 | Open `/dashboard/shops/[id]/customize` | Theme editor matches wizard choices | |
| 4.5 | Edit product from manage shop | Changes reflect on preview | |
| 4.6 | Dashboard home shows shop under **Upcoming** | Card visible with correct time | |
| 4.7 | Dashboard **calendar** shows scheduled shop | Event on correct date | |

---

## Phase 5 — Seller: Stripe Connect payouts (15 min)

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 5.1 | Checklist shows payouts incomplete → `/dashboard/payouts` | Stripe Connect onboarding | |
| 5.2 | Complete Express onboarding (live mode) | Return URL shows success; checklist item completes | |
| 5.3 | Refresh manage shop | Payouts step checked off | |

*If onboarding already done on this account, confirm checklist shows complete.*

---

## Phase 6 — Buyer: waiting room (scheduled shop) (15 min)

Buyer opens the **shared shop link** (not logged in first, then logged in).

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 6.1 | Anonymous: open shop link before `start_at` | Countdown, cover, seller info; no purchase buttons | |
| 6.2 | Click **Remind me** / waitlist while logged out | Redirect to login with `redirectTo` back to shop | |
| 6.3 | Log in → subscribe to reminder | Subscribed state; confirmation if shown | |
| 6.4 | Logged-in: **Follow** seller on shop page | Follow state toggles; count increments on profile | |
| 6.5 | Share card / copy link as buyer | Works from buyer context | |
| 6.6 | Seller posts **announcement** from manage shop | Buyer sees announcement in waiting room (realtime) | |

---

## Phase 7 — Shop opens: room, chat, products (25 min)

Wait for countdown (or seller uses **open now** if available) until status is **Open**.

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 7.1 | Buyer page updates to **Open** without hard refresh (or within seconds) | Products visible | |
| 7.2 | Click product → **detail dialog** | Multi-photo gallery, price, shipping, buy/bid CTA | |
| 7.3 | Anonymous: click **Buy** | Login prompt with return URL | |
| 7.4 | Logged-in: open chat | Can send message; appears for seller | |
| 7.5 | Send emoji quick-reaction if available | Message sends | |
| 7.6 | Seller: mute a buyer (if moderation used) | Buyer cannot send more messages | |
| 7.7 | Viewer count updates when second browser joins | Presence count increases | |
| 7.8 | **Publish** if shop was still draft — seller publishes with ≥1 product | Shop becomes live at link; checklist complete | |

---

## Phase 8 — Live streaming (45 min)

**Native PopUp Live** is the primary path. Also run one external-stream regression.

Detailed substeps: `docs/MANUAL_TESTING.md` § Native live streaming.

### Seller — native (PopUp Live)

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 8.1 | **Test camera & mic** before go-live | Preview only you see; mic levels move | |
| 8.2 | **Go live** (first time) | Native live ToS modal → accept → LIVE badge + timer | |
| 8.3 | Buyer (second browser): shop page | Video within ~5s; cover replaced by stream | |
| 8.4 | Anonymous viewer | Can watch stream; chat/buy still need login | |
| 8.5 | Seller **End live** | Video stops; cover returns; shop stays **Open** | |
| 8.6 | **Go live** again | No second ToS; works immediately | |

### Buyer — notify when live

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 8.7 | Buyer subscribed **Notify me when live**; seller goes live | Email and/or push received | |
| 8.8 | Seller ends live; buyer does **not** re-subscribe; seller goes live again | **No** second alert (until re-subscribe) | |
| 8.9 | Buyer clicks **Notify me when live** again after end | Re-subscribed; next go-live sends alert | |

### Seller — extend / end shop

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 8.10 | While open: **+15m** / **+1h** | `end_at` extends; buyer countdown updates | |
| 8.11 | **End shop** while live (confirm dialog) | Shop **Ended**; stream stops; buyers see ended state | |

### External stream regression

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 8.12 | New or duplicate shop: wizard → YouTube/Twitch URL | External embed on go-live | |
| 8.13 | Go live with external URL | Embedded player works when live | |

### Error cases

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 8.14 | Deny camera permission → Go live | Clear error; no crash | |

---

## Phase 9 — Flash drops (20 min)

On an **open** shop (native or external stream).

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 9.1 | Seller: flash **discount** on existing product | Buyers see discount + confetti/realtime update | |
| 9.2 | Buyer: purchase flash-discounted item | Checkout at discounted price | |
| 9.3 | Seller: create **flash-only** buy-now item mid-drop | Appears for buyers without refresh | |
| 9.4 | Seller: create flash-only **auction** item | Auction panel appears for buyers | |
| 9.5 | Seller: **clear** flash discount | Price reverts on buyer UI | |

---

## Phase 10 — Live auctions (30 min)

Use the auction product from Phase 3.

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 10.1 | Seller: start auction from manage shop | Auction goes live; countdown visible to buyers | |
| 10.2 | Buyer A: place bid | Bid shows as high bid; realtime update | |
| 10.3 | Buyer B (partner on second account or incognito): outbid | Previous bidder sees update | |
| 10.4 | Bid near end triggers **anti-snipe** extension if configured | Timer extends | |
| 10.5 | Auction ends; winner declared | Winner sees checkout CTA | |
| 10.6 | Winner completes Stripe Checkout | Order created; others see sold state | |
| 10.7 | Non-winner attempts checkout on that SKU | Blocked / sold out | |
| 10.8 | Let auction payment window expire (optional, slow) | Webhook marks expired; inventory released | |

---

## Phase 11 — Buy Now checkout (buyer) (20 min)

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 11.1 | Buyer: **Buy now** on in-stock product | Redirect to Stripe Checkout | |
| 11.2 | Complete payment (live card) | Redirect to `/orders?checkout=success` | |
| 11.3 | Success page | Celebration UI; follow/share CTAs | |
| 11.4 | **Buyer email**: order confirmation | Received from your domain (not only Resend sandbox) | |
| 11.5 | **Seller email**: new sale with **shipping address** | Received | |
| 11.6 | `/orders` list | New order with status **Paid** / awaiting shipment | |
| 11.7 | Open order detail | Timeline, product, shipping address, totals | |
| 11.8 | Two buyers checkout last unit simultaneously | Only one succeeds; other sees sold out / error | |
| 11.9 | Abandon checkout (close Stripe tab) | Return with `?checkout=canceled`; hold releases after cron | |

---

## Phase 12 — Fulfillment & payouts (seller) (20 min)

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 12.1 | Seller: manage shop → **Orders** table | Buyer order listed | |
| 12.2 | **Mark shipped** with carrier + tracking number | Status updates; buyer email with tracking link | |
| 12.3 | Buyer: order shows **Shipped** + tracking link | Carrier URL opens correctly | |
| 12.4 | Buyer: **Confirm receipt** | Order marked delivered | |
| 12.5 | Funds still held (72h) until release cron | Expected in production | |
| 12.6 | Seller: `/dashboard/payouts` | Shows Connect status / balance context | |

*To test release without waiting 72h, use a staging env with `RELEASE_DELAY_HOURS=0`,
or verify cron JSON only on prod (§18).*

---

## Phase 13 — Ratings & follow (10 min)

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 13.1 | Buyer: rate seller after receipt (1–5 stars + comment) | Rating saved | |
| 13.2 | Seller profile `/u/[username]` | `rating_avg` / count updated | |
| 13.3 | Buyer: `/following` | Followed seller listed | |
| 13.4 | Unfollow and re-follow | Count and state correct | |
| 13.5 | **Notify** on profile (web push) if VAPID configured | Subscription prompt; push on go-live (optional) | |

---

## Phase 14 — Notifications & email lifecycle (30 min)

Requires Resend + verified domain. Check spam folders.

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 14.1 | Purchase emails (§11.4–11.5) | ✅ already tested | |
| 14.2 | Shipped email (§12.2) | Tracking in body | |
| 14.3 | **Drop reminder 24h** — schedule shop opening >24h out; buyer subscribed | Email ~24h before (cron must run — §18) | |
| 14.4 | **Drop reminder 1h** | Email ~1h before | |
| 14.5 | **Opening** reminder | Email when shop opens | |
| 14.6 | **Go-live** alert to followers + live-reminder subs | Instant email on go-live (§8.7) | |
| 14.7 | Seller **unshipped >3 days** reminder | Cron email to seller (§18 or wait) | |
| 14.8 | Buyer **receipt nudge** ~3 days after ship | Cron email to buyer (max 2) | |

---

## Phase 15 — Public pages & navigation (15 min)

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 15.1 | Home `/` (invite-only) | Seller-led hero; CTA to create shop | |
| 15.2 | `/sell` | Five-step how-it-works | |
| 15.3 | `/about` | About copy; contact link works | |
| 15.4 | Header nav: logo, sell, login/signup | All links work | |
| 15.5 | Footer: legal links | Terms + Privacy | |
| 15.6 | Invalid shop UUID `/shop/not-a-uuid` | Shop 404 page | |
| 15.7 | Random path `/does-not-exist` | Global 404 | |
| 15.8 | Mobile viewport (phone or DevTools) | Layout usable; stream + checkout work | |

---

## Phase 16 — Seller dashboard & post-drop (20 min)

After shop **Ended**:

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 16.1 | Dashboard: shop under **Ended** | Correct status | |
| 16.2 | **Drop report** on manage shop | Sales, viewers, chat stats, waitlist, auctions | |
| 16.3 | **Duplicate shop** | New draft with copied products/settings | |
| 16.4 | Edit duplicated draft schedule | Can schedule next drop | |
| 16.5 | Dashboard stats (revenue, orders) | Reflect test orders | |

---

## Phase 17 — Theme & customize (10 min)

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 17.1 | Change theme on open shop via customize | Buyer page updates after refresh/realtime | |
| 17.2 | Product grid 2 vs 3 columns | Layout correct on mobile + desktop | |
| 17.3 | Hide chat section | Chat block hidden for buyers | |

---

## Phase 18 — Cron jobs (manual, seller/admin) (15 min)

Use `CRON_SECRET` from Vercel env. Never share the secret in bug reports.

```bash
# Release funds, free holds, ship reminders, receipt nudges (daily on Vercel)
curl -s "https://www.popupdrop.co/api/cron/release-funds?secret=YOUR_CRON_SECRET" | jq

# Drop reminders (every 15 min via cron-job.org)
curl -s "https://www.popupdrop.co/api/cron/send-drop-reminders?secret=YOUR_CRON_SECRET" | jq
```

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 18.1 | `release-funds` returns 200 JSON | Fields like `released`, `holdsReleased`, `shipReminders`, `receiptNudges` | |
| 18.2 | `send-drop-reminders` returns 200 JSON | `sent` / `skipped` counts; no 500 | |
| 18.3 | Wrong secret | 401 Unauthorized | |
| 18.4 | cron-job.org (or Vercel Pro) history | Recent successful calls every ~15 min for drop reminders | |
| 18.5 | Uptime monitor on `/api/health` | Green / alerting configured | |

---

## Phase 19 — Edge cases & security (20 min)

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 19.1 | Buyer opens another seller's **draft** shop URL | 404 or forbidden | |
| 19.2 | Non-owner opens `/dashboard/shops/[id]` for someone else's shop | Blocked | |
| 19.3 | Profanity or spam in chat | Filtered or moderated per `profanity` rules | |
| 19.4 | XSS attempt in chat message | Escaped / not executed | |
| 19.5 | Stripe webhook failure simulation (optional) | Orders stay consistent; check Stripe dashboard logs | |
| 19.6 | Session expired mid-checkout | Graceful re-login path | |

---

## Phase 20 — PWA & install (5 min)

Production only (service worker registers when `NODE_ENV=production`).

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 20.1 | Mobile Chrome → Add to Home Screen | Installs; opens in standalone mode | |
| 20.2 | Open installed PWA → shop link | Loads correctly | |

---

## Phase 21 — Marketplace mode (optional, post-invite)

**Only when** you set `NEXT_PUBLIC_DISCOVERY_MODE=marketplace` on Vercel and redeploy.

| # | Step | Expected | ✓ |
| - | ---- | -------- | - |
| 21.1 | Home shows buyer-led marketplace hero + live ticker | | |
| 21.2 | `/explore` — tabs All / Live / Opening Soon / Following | Public shops listed | |
| 21.3 | `/search` — search creator name and shop name | Results correct | |
| 21.4 | Public visibility shop appears in Explore | Link-only shops do not | |

*Skip this phase while in invite-only launch.*

---

## Suggested two-person script

### Session A — ~2 hours (evening 1)

1. Phase 0–2 together (health, auth, legal)
2. Seller: Phases 3–5 (create shop, payouts)
3. Buyer: Phase 6 (waiting room + remind me)
4. Wait for open OR schedule start time for Session B

### Session B — ~2–3 hours (drop night)

1. Phase 7 (room opens)
2. Phase 8 (go live — both watch stream)
3. Phase 9–10 (flash + auction)
4. Phase 11 (real purchase — low price)
5. Phase 12–13 (ship, confirm, rate)

### Session C — ~1 hour (next day)

1. Phase 14 (remaining emails / cron)
2. Phase 15–17 (pages, drop report, duplicate)
3. Phase 18–20 (cron, edge cases, PWA)
4. Phase 0.7 load smoke if not done

---

## Marketing sign-off gate

Do **not** start paid ads until all are true:

- [ ] Every phase above marked ✅ or documented ⏭️ with reason
- [ ] No open **severity: blocker** bugs
- [ ] Real purchase dry-run completed (Phases 11–12) with emails received
- [ ] Live stream tested with 2+ viewers (Phase 8)
- [ ] `npm run load:shop-smoke` passed on production shop URL
- [ ] Sentry shows no unexplained error spike during test sessions
- [ ] `/api/health` monitored
- [ ] Drop reminder cron firing (Phase 18.4)
- [ ] Legal pages reviewed (attorney optional but recommended)
- [ ] `RELEASE_DELAY_HOURS=72` confirmed in production env

When ready to open discovery:

- [ ] Enough scheduled seller supply for Explore
- [ ] Switch `NEXT_PUBLIC_DISCOVERY_MODE=marketplace` and run Phase 21

---

## Bug report template

```text
Title:
Phase / Step:
URL:
Account (seller/buyer/anonymous):
Browser + device:
Steps to reproduce:
Expected:
Actual:
Screenshot / Sentry link:
Severity: blocker | major | minor
```

---

*Last updated: June 2026 — production at https://www.popupdrop.co, migrations through `0020_seller_terms_accepted.sql`.*
