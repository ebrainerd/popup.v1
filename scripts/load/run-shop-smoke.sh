#!/usr/bin/env bash
# HTTP load smoke against a live shop page (k6). Safe for production — read-only routes.
#
# Usage:
#   ./scripts/load/run-shop-smoke.sh https://www.popupdrop.co/shop/<shop-uuid>
#   npm run load:shop-smoke -- https://www.popupdrop.co/shop/<shop-uuid>
#
# Optional env:
#   VUS=50 DURATION=3m   peak virtual users and hold time (defaults: 30, 2m)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
K6_SCRIPT="${ROOT}/scripts/load/shop-smoke.js"

SHOP_URL="${1:-${SHOP_URL:-}}"
VUS="${VUS:-30}"
DURATION="${DURATION:-2m}"

usage() {
  cat <<EOF
Usage: $(basename "$0") <shop-url>

  shop-url  Full URL of a published shop, e.g.
            https://www.popupdrop.co/shop/00000000-0000-0000-0000-000000000000

Optional environment variables:
  VUS=50       Peak concurrent virtual users (default: 30)
  DURATION=3m  Time at peak load (default: 2m)

Install k6 once: brew install k6
EOF
  exit 1
}

[[ -n "$SHOP_URL" ]] || usage

if ! command -v k6 >/dev/null 2>&1; then
  echo "error: k6 is not installed." >&2
  echo "  macOS:  brew install k6" >&2
  echo "  other:  https://k6.io/docs/get-started/installation/" >&2
  exit 1
fi

if [[ ! -f "$K6_SCRIPT" ]]; then
  echo "error: k6 script not found at $K6_SCRIPT" >&2
  exit 1
fi

read -r BASE_URL SHOP_ID < <(
  python3 - "$SHOP_URL" <<'PY'
import re
import sys
from urllib.parse import urlparse

raw = sys.argv[1].strip()
if not re.match(r"^https?://", raw, re.I):
    raw = "https://" + raw

parsed = urlparse(raw)
if not parsed.netloc:
    print("error: invalid shop URL", file=sys.stderr)
    sys.exit(1)

match = re.search(
    r"/shop/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})",
    parsed.path,
)
if not match:
    print(
        "error: URL must include /shop/<uuid> "
        "(e.g. https://www.popupdrop.co/shop/00000000-0000-0000-0000-000000000000)",
        file=sys.stderr,
    )
    sys.exit(1)

base = f"{parsed.scheme}://{parsed.netloc}"
print(base)
print(match.group(1))
PY
)

echo "→ Base URL:  $BASE_URL"
echo "→ Shop ID:   $SHOP_ID"
echo "→ Peak VUs:  $VUS for $DURATION"
echo "→ Running k6…"
echo ""

exec env BASE_URL="$BASE_URL" SHOP_ID="$SHOP_ID" VUS="$VUS" DURATION="$DURATION" \
  k6 run "$K6_SCRIPT"
