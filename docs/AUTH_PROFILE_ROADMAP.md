# Auth & profile (shipped)

> **Shipped feature reference.** This is not a pending roadmap. Use it to see
> what changed and how signup flows behave in production. For live ops status,
> see **`docs/HANDOFF.md`**.

## Status

All tasks below are **shipped** in the app. Repo schema includes migration
`0021_profile_setup_username.sql` (through **`0029`** in `supabase/migrations/`).
Apply hosted production migrations in order — see **`docs/DEPLOYMENT.md`**, not
ad-hoc SQL in this doc.

## Tasks (all implemented)

| # | Task | Status |
| - | ---- | ------ |
| 1 | Fix signup captcha (explicit Turnstile + token in form) | Done |
| 2 | Confirm password on email signup | Done |
| 3 | Username at email signup + validation + reserved names | Done |
| 4 | Optional avatar after email signup (post-session step) | Done |
| 5 | OAuth onboarding (`/onboarding`) for username + optional avatar | Done |
| 6 | Display `@username` only in UI (no display name) | Done |
| 7 | `profile_setup_complete` gate in middleware + auth callback | Done |

## User flows

### Email signup

1. `/signup` — username, email, password, confirm password, Turnstile
2. Server validates username (3–20 chars, `a-z`/`0-9`/`_`, reserved list) and creates auth user with `metadata.username`
3. Optional avatar step (logged in) → dashboard
4. `profile_setup_complete = true` from DB trigger

### Google / OAuth signup

1. OAuth → `/auth/callback`
2. If `profile_setup_complete = false` → `/onboarding`
3. Pick username + optional avatar → dashboard

### Username rules

- 3–20 characters, lowercase
- Must start with a letter
- Letters, numbers, underscores only; no trailing `_` or `__`
- Reserved: `admin`, `support`, `popup`, route names, etc. (`src/lib/username.ts`)
- **Permanent** — changes via `support@popupdrop.co` only (shown on signup/onboarding)

## Database

- Migration `0021_profile_setup_username.sql`
- Column `profiles.profile_setup_complete`
- Updated `handle_new_user()` trigger

## Apply migration on production

Use **`docs/DEPLOYMENT.md`** for the full go-live checklist and migration
workflow. Apply all pending repo migrations in order (including `0021` and any
later files through `0029`).

## Related files

| Area | Path |
| ---- | ---- |
| Username validation | `src/lib/username.ts` |
| Auth actions | `src/app/(auth)/actions.ts` |
| Signup UI | `src/app/(auth)/signup-form.tsx` |
| Login UI | `src/app/(auth)/login-form.tsx` |
| OAuth onboarding | `src/app/onboarding/` |
| Turnstile | `src/components/turnstile.tsx` |
| Middleware gate | `src/lib/supabase/middleware.ts` |
