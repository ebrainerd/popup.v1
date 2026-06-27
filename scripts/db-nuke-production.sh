#!/usr/bin/env bash
# Wipe a HOSTED Supabase project (e.g. production) and re-apply migrations from scratch.
#
# Prerequisites (pick one):
#   A) Linked project (recommended):
#        supabase login
#        supabase link --project-ref <your-project-ref>
#      Then: npm run db:nuke:production
#
#   B) Direct Postgres URL (from Supabase Dashboard → Database → Connection string):
#        export SUPABASE_DB_URL='postgresql://postgres.[ref]:[password]@...'
#      Then: npm run db:nuke:production
#
# This does NOT touch Stripe, Vercel, or other services — only the Supabase database
# (+ auth users + storage object rows). Empty Storage buckets in the dashboard if
# orphaned files remain.
set -euo pipefail

cd "$(dirname "$0")/.."

CONFIRM_PHRASE="NUKE PRODUCTION"
SQL_FILE="scripts/sql/nuke-auth-and-storage.sql"

if ! command -v supabase >/dev/null 2>&1; then
  echo "error: supabase CLI not found. Install: https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
  echo "error: missing $SQL_FILE" >&2
  exit 1
fi

USE_DB_URL=false
if [ -n "${SUPABASE_DB_URL:-}" ]; then
  USE_DB_URL=true
  echo "Target: remote database via SUPABASE_DB_URL"
elif [ -f supabase/.temp/project-ref ]; then
  echo "Target: linked Supabase project ref $(cat supabase/.temp/project-ref)"
else
  echo "error: no linked project and SUPABASE_DB_URL is not set." >&2
  echo "" >&2
  echo "Link your production project first:" >&2
  echo "  supabase login" >&2
  echo "  supabase link --project-ref <ref>   # ref is in Dashboard → Project Settings → General" >&2
  echo "" >&2
  echo "Or set SUPABASE_DB_URL to the Postgres connection string from the dashboard." >&2
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  PRODUCTION / HOSTED DATABASE WIPE                               ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║  • Drops all app data and re-runs supabase/migrations/*.sql        ║"
echo "║  • Deletes ALL auth users (you must sign up again)                 ║"
echo "║  • Deletes storage object metadata (uploaded images)               ║"
echo "║  • Irreversible — double-check this is the right project           ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
read -r -p "Type ${CONFIRM_PHRASE} to continue: " confirm
if [ "${confirm}" != "${CONFIRM_PHRASE}" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Step 1/2: Reset database (re-apply migrations)..."
if [ "$USE_DB_URL" = true ]; then
  supabase db reset --db-url "$SUPABASE_DB_URL" --yes
else
  supabase db reset --linked --yes
fi

echo ""
echo "Step 2/2: Clear auth users and storage metadata..."
if [ "$USE_DB_URL" = true ]; then
  supabase db query --db-url "$SUPABASE_DB_URL" -f "$SQL_FILE"
else
  supabase db query --linked -f "$SQL_FILE"
fi

echo ""
echo "Done. Hosted database is fresh."
echo "  • Sign up again on your production site"
echo "  • Confirm migrations match: supabase db push (if you add new ones later)"
echo "  • Storage: if old files linger, delete them under Dashboard → Storage"
