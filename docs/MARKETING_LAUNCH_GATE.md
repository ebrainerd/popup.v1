# Marketing launch gate — evidence-based status

**Branch audited:** `cursor/pre-marketing-readiness-d74f`  
**Audit date:** 2026-07-09  
**Auditor:** docs-only pass (no human prod dry-run in this environment)

---

## Gate statement

> **One founding seller can run a real drop to a phone-heavy audience; money clears; emails land; they want to schedule the next drop.**

Paid marketing (founding-seller outreach, ads, broad announcements) should not start until this gate is **proven in production** with a real two-person dry-run — not inferred from code or infra checklists alone.

**Primary test plan:** `docs/PRE_MARKETING_TEST.md`  
**Infrastructure companion:** `docs/PRODUCTION_READINESS.md`  
**Drop-loop product spec:** `docs/CREATOR_DROP_LOOP.md`

---

## Score summary

| Metric | Count | Notes |
| ------ | ----- | ----- |
| **pass** | 18 | Mostly infra wiring + automated CI on this branch |
| **fail** | 0 | No verified production regressions in this audit |
| **unknown** | 42 | Requires human prod test (Phases 0–21) |
| **blocked** | 2 | Human dry-run prerequisite; prod shop UUID for k6 |

**Gate score:** **18 / 62 scored items (29%)** — infra and code health only; **0% of buyer/seller drop-loop items verified in prod.**

---

## Recommendation: **NO-GO**

Do **not** start paid marketing or founding-seller outreach at scale until:

1. A complete two-person production dry-run (`docs/PRE_MARKETING_TEST.md`) is recorded with pass marks.
2. At least one **real live purchase** (Phases 11–12) with buyer **and** seller emails received in real inboxes.
3. Native live stream verified with **2+ viewers** on production (Phase 8).
4. k6 shop smoke re-run on a **current** published shop URL after any major change.

Infra is largely wired (per `docs/HANDOFF.md`); product behavior on the critical path is **unverified** in production from this environment.

---

## Checklist by pillar

Legend: **pass** | **fail** | **unknown** | **blocked**

### A — Infrastructure & trust (site up, legal, ops)

| ID | Item | Status | Evidence |
| -- | ---- | ------ | -------- |
| A1 | Custom domain live (`popupdrop.co` / `www`) | **pass** | `docs/HANDOFF.md` § Infrastructure — checked |
| A2 | `GET /api/health` returns 200 + `ok` | **pass** | Curl 2026-07-09: `{"status":"ok","service":"popup",...}` |
| A3 | Home `/` loads (no 5xx) | **pass** | Curl 2026-07-09: HTTP 200 |
| A4 | `/explore` holding page (invite-only) | **pass** | Curl 2026-07-09: HTTP 200; `docs/PRE_MARKETING_TEST.md` Phase 0.5 |
| A5 | Legal pages render; `legal@popupdrop.co` | **unknown** | `docs/PRE_MARKETING_TEST.md` Phase 0.3, 2.1–2.2 — unchecked |
| A6 | Resend domain verified; order emails on `popupdrop.co` | **pass** | `docs/HANDOFF.md` § Infrastructure — checked |
| A7 | Stripe live webhook wired | **pass** | `docs/HANDOFF.md` — `checkout.session.completed`, etc. |
| A8 | `CRON_SECRET` + daily `release-funds` on Vercel | **pass** | `docs/HANDOFF.md` § Infrastructure — checked |
| A9 | Drop-reminder cron every ~15 min (cron-job.org) | **pass** | `docs/HANDOFF.md` — checked; Phase 18.4 still needs human verify |
| A10 | Sentry + uptime monitor on `/api/health` | **pass** | `docs/HANDOFF.md` — checked |
| A11 | `RELEASE_DELAY_HOURS=72` in production | **unknown** | `docs/PRODUCTION_READINESS.md` wiring — unchecked; requires Vercel env confirm |
| A12 | `PLATFORM_FEE_BPS=900` in production | **unknown** | `docs/PRODUCTION_READINESS.md` wiring — unchecked |
| A13 | Migrations applied through latest (`0022`) | **unknown** | `docs/HANDOFF.md` says through `0022`; prod apply not verified here |
| A14 | Attorney review of terms/privacy (optional) | **unknown** | `docs/HANDOFF.md` Before marketing — unchecked |

### B — Seller kit & drop loop (`docs/CREATOR_DROP_LOOP.md`)

| ID | Item | Status | Evidence |
| -- | ---- | ------ | -------- |
| B1 | Launch checklist on manage shop | **unknown** | Shipped per HANDOFF; `PRE_MARKETING_TEST` Phase 4.1 unchecked |
| B2 | Copy share link / share card | **unknown** | Phase 4.3, 6.5 — unchecked |
| B3 | Scheduled page: countdown, remind me, follow, OG preview | **unknown** | CREATOR_DROP_LOOP Milestone A; Phase 6 — unchecked |
| B4 | Drop reminders (24h / 1h / opening) deliver | **unknown** | Phase 14.3–14.5 — unchecked; cron existence ≠ email proof |
| B5 | Seller announcements in waiting room (realtime) | **unknown** | Phase 6.6 — unchecked |
| B6 | Post-drop report (sales, viewers, waitlist) | **unknown** | Phase 16.2 — unchecked |
| B7 | Duplicate shop → schedule next drop | **unknown** | Phase 16.3–16.4 — unchecked |
| B8 | Seller wants to run again (qualitative) | **blocked** | Requires human prod dry-run + seller feedback |

### C — Seller journey (auth, wizard, payouts)

Maps to `PRE_MARKETING_TEST` Phases 1–5.

| ID | Item | Status | Evidence |
| -- | ---- | ------ | -------- |
| C1 | Buyer signup (email + Turnstile) | **unknown** | Phase 1.1–1.5 — unchecked |
| C2 | Seller signup (Google OAuth path) | **unknown** | Phase 1.2 — unchecked |
| C3 | Seller terms gate on first shop create | **unknown** | Phase 2.3–2.6 — unchecked |
| C4 | Shop wizard (details, products, layout, stream, schedule) | **unknown** | Phase 3.1–3.18 — unchecked |
| C5 | HEIC cover upload (iPhone) | **unknown** | Phase 3.3 — unchecked |
| C6 | Draft save / resume | **unknown** | Phase 3.5 — unchecked |
| C7 | Stripe Connect Express onboarding (live) | **unknown** | Phase 5.1–5.3 — unchecked |
| C8 | Launch checklist completes through publish | **unknown** | Phase 4.1, 7.8 — unchecked |

### D — Mobile room & phone-heavy audience

Maps to Phases 6–7, 8 (viewer), 15.8, 17, 20.

| ID | Item | Status | Evidence |
| -- | ---- | ------ | -------- |
| D1 | Waiting room usable on phone (countdown, remind me) | **unknown** | Phase 6 — unchecked; no mobile prod test |
| D2 | Shop opens without hard refresh on mobile | **unknown** | Phase 7.1 — unchecked |
| D3 | Product detail + buy/bid on mobile | **unknown** | Phase 7.2–7.3 — unchecked |
| D4 | Chat send on mobile | **unknown** | Phase 7.4 — unchecked |
| D5 | Native live video on phone within ~5s | **unknown** | Phase 8.3 — unchecked |
| D6 | Mobile viewport layout usable (Phase 15.8) | **unknown** | Phase 15.8 — unchecked |
| D7 | Four layout archetypes on mobile 375px | **unknown** | Phase 17.2, 17.8; `MANUAL_TESTING.md` B6 — unchecked |
| D8 | PWA add-to-home-screen + shop load | **unknown** | Phase 20.1–20.2 — unchecked |

### E — Commerce & money clears

Maps to Phases 9–12.

| ID | Item | Status | Evidence |
| -- | ---- | ------ | -------- |
| E1 | Buy Now → Stripe Checkout (live card) | **unknown** | Phase 11.1–11.2 — unchecked |
| E2 | Order appears Paid in `/orders` | **unknown** | Phase 11.6–11.7 — unchecked |
| E3 | Concurrent checkout: only one wins last unit | **unknown** | Phase 11.8 — unchecked |
| E4 | Flash discount purchase at discounted price | **unknown** | Phase 9.2 — unchecked |
| E5 | Live auction: bid, win, checkout | **unknown** | Phase 10.1–10.7 — unchecked |
| E6 | Seller marks shipped; buyer tracking email | **unknown** | Phase 12.1–12.3 — unchecked |
| E7 | Funds held 72h until release cron | **unknown** | Phase 12.5 — unchecked |
| E8 | Seller payouts dashboard reflects sale | **unknown** | Phase 12.6 — unchecked |
| E9 | Real money cleared end-to-end | **blocked** | Requires human prod purchase (live Stripe); not run in this audit |

### F — Emails land

Maps to Phases 11.4–11.5, 14.

| ID | Item | Status | Evidence |
| -- | ---- | ------ | -------- |
| F1 | Buyer order confirmation email | **unknown** | Phase 11.4 — unchecked |
| F2 | Seller new-sale email with shipping address | **unknown** | Phase 11.5 — unchecked |
| F3 | Shipped email with tracking link | **unknown** | Phase 14.2 — unchecked |
| F4 | Go-live alert to reminder subscribers | **unknown** | Phase 8.7, 14.6 — unchecked |
| F5 | Drop reminder 24h / 1h / opening | **unknown** | Phase 14.3–14.5 — unchecked |
| F6 | Cron `send-drop-reminders` returns 200 JSON | **unknown** | Phase 18.2 — unchecked |

### G — Live drop energy (stream, flash, chat, ratings)

Maps to Phases 7–10, 13.

| ID | Item | Status | Evidence |
| -- | ---- | ------ | -------- |
| G1 | Native go-live (camera/mic, ToS once) | **unknown** | Phase 8.1–8.2 — unchecked |
| G2 | 2+ viewers; presence count updates | **unknown** | Phase 7.7, 8.3 — unchecked |
| G3 | Extend shop (+15m / +1h) while open | **unknown** | Phase 8.10 — unchecked |
| G4 | Flash drops (discount, flash-only SKU) realtime | **unknown** | Phase 9.1–9.4 — unchecked |
| G5 | Chat moderation (mute) | **unknown** | Phase 7.6 — unchecked |
| G6 | Post-purchase rating + follow | **unknown** | Phase 13.1–13.4 — unchecked |

### H — Scale, security & sign-off

Maps to Phases 18–19 and marketing sign-off block.

| ID | Item | Status | Evidence |
| -- | ---- | ------ | -------- |
| H1 | k6 `load:shop-smoke` on prod shop URL | **unknown** | HANDOFF: "passed once"; sign-off Phase unchecked; k6 not installed in audit VM; no shop UUID |
| H2 | Load test at 2× expected peak | **unknown** | `PRODUCTION_READINESS.md` launch gate — unchecked |
| H3 | Draft shop URL blocked for non-owner | **unknown** | Phase 19.1 — unchecked |
| H4 | Dashboard shop access blocked for non-owner | **unknown** | Phase 19.2 — unchecked |
| H5 | No blocker bugs open | **unknown** | Sign-off checklist — unchecked |
| H6 | Sentry clean during test sessions | **unknown** | Sign-off — unchecked |
| H7 | All PRE_MARKETING_TEST phases ✅ or documented ⏭️ | **unknown** | All phase tables empty — no session recorded |

### I — Code health (this branch, local CI)

| ID | Item | Status | Evidence |
| -- | ---- | ------ | -------- |
| I1 | `npm run typecheck` | **pass** | 2026-07-09 on `cursor/pre-marketing-readiness-d74f` |
| I2 | `npm run test` | **pass** | 142 passed, 10 skipped |
| I3 | `npm run lint` | **pass** | 0 errors, 7 warnings |
| I4 | `npm run build` | **pass** | 2026-07-09 |
| I5 | Layout archetypes Phase 6 QA (local preview) | **pass** | `docs/HANDOFF.md` — customize preview smoke passed |

---

## PRE_MARKETING_TEST phase rollup

| Phase | Topic | Status | Notes |
| ----- | ----- | ------ | ----- |
| 0 | Site health | **partial** | Health/home/explore curl pass; legal/robots/sitemap unverified |
| 1 | Authentication | **unknown** | All steps unchecked |
| 2 | Legal & seller terms | **unknown** | All steps unchecked |
| 3 | Create shop wizard | **unknown** | All steps unchecked |
| 4 | Manage shop (pre-open) | **unknown** | All steps unchecked |
| 5 | Stripe Connect | **unknown** | All steps unchecked |
| 6 | Buyer waiting room | **unknown** | All steps unchecked |
| 7 | Shop opens (room) | **unknown** | All steps unchecked |
| 8 | Live streaming | **unknown** | All steps unchecked |
| 9 | Flash drops | **unknown** | All steps unchecked |
| 10 | Live auctions | **unknown** | All steps unchecked |
| 11 | Buy Now checkout | **unknown** | All steps unchecked |
| 12 | Fulfillment & payouts | **unknown** | All steps unchecked |
| 13 | Ratings & follow | **unknown** | All steps unchecked |
| 14 | Email lifecycle | **unknown** | All steps unchecked |
| 15 | Public pages & mobile | **partial** | Home loads; 15.8 mobile unverified |
| 16 | Post-drop & next drop | **unknown** | All steps unchecked |
| 17 | Layout archetypes | **unknown** | Local QA pass only; prod buyer-page unverified |
| 18 | Cron jobs | **unknown** | Infra wired; manual curl/history unverified |
| 19 | Edge cases & security | **unknown** | All steps unchecked |
| 20 | PWA | **unknown** | All steps unchecked |
| 21 | Marketplace mode | **N/A** | Skipped — `invite_only` launch (`HANDOFF.md`) |

---

## Marketing sign-off gate (`PRE_MARKETING_TEST.md` § Marketing sign-off)

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| Every phase ✅ or documented ⏭️ | **unknown** | No test session recorded |
| No open blocker bugs | **unknown** | — |
| Real purchase dry-run + emails | **blocked** | Requires human prod test |
| Live stream 2+ viewers | **unknown** | Phase 8 unchecked |
| k6 shop smoke on prod URL | **unknown** | Unchecked; prior pass not re-verified |
| Sentry clean during tests | **unknown** | — |
| `/api/health` monitored | **pass** | HANDOFF + curl |
| Drop reminder cron firing | **unknown** | Phase 18.4 unchecked |
| Legal pages reviewed | **unknown** | Optional attorney — unchecked |
| `RELEASE_DELAY_HOURS=72` confirmed | **unknown** | Vercel env not inspected |

---

## Top 5 remaining actions (priority order)

1. **Run full two-person prod dry-run** — `docs/PRE_MARKETING_TEST.md` Sessions A–C with a partner; record pass/fail in a dated session table. Minimum bar: Phases 0–8, 11–12, 16 on **real phones**.
2. **Complete one real live purchase with email proof** — low-price SKU, live Stripe card, confirm buyer + seller emails in inbox (not sandbox). Phases 11.4–11.5, 12.2.
3. **Verify native live with 2+ viewers on production** — Phase 8.1–8.5 on seller phone + buyer phone; confirm video within ~5s.
4. **Re-run k6 shop smoke** — `npm run load:shop-smoke -- https://www.popupdrop.co/shop/<published-shop-uuid>` after dry-run shop exists; confirm p95 &lt; 3s, 0% failures.
5. **Confirm production env vars** — `RELEASE_DELAY_HOURS=72`, `PLATFORM_FEE_BPS=900`, migrations through `0022` on hosted Supabase; tick `docs/HANDOFF.md` Before marketing only after dry-run evidence exists.

---

## How to update this doc

After each prod test session:

1. Fill checkboxes in `docs/PRE_MARKETING_TEST.md`.
2. Update status columns here with **pass** / **fail** and link to session notes or Sentry/Stripe IDs.
3. Recompute score summary and flip recommendation to **GO** only when gate pillars B7–B8, E9, F1–F2, and sign-off table are **pass**.

---

*Audit method: read `docs/PRE_MARKETING_TEST.md`, `docs/HANDOFF.md`, `docs/PRODUCTION_READINESS.md`, `docs/MANUAL_TESTING.md`, `docs/CREATOR_DROP_LOOP.md`; curl prod health/home/explore; run local `typecheck` / `test` / `lint` / `build`. No src/ changes. No human purchase or mobile stream test performed.*
