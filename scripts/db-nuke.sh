#!/usr/bin/env bash
# Wipe the local Supabase database and re-apply migrations + seed.
# Requires: Docker running, `supabase start` already done once.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v supabase >/dev/null 2>&1; then
  echo "error: supabase CLI not found. Install it first: https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

echo "This will erase ALL local data (auth users, shops, orders, storage metadata)."
echo "Local Supabase only — does not touch hosted/production projects."
echo ""
read -r -p "Continue? [y/N] " confirm
if [[ ! "${confirm}" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Resetting database..."
supabase db reset

echo ""
echo "Done. Local stack is fresh:"
echo "  - Sign up again at http://localhost:3000/signup"
echo "  - Mailpit (local email): http://127.0.0.1:54324"
supabase status 2>/dev/null | grep -E "API URL|ANON_KEY" || true
