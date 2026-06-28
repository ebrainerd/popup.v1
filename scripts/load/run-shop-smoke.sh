#!/usr/bin/env bash
# macOS/Linux wrapper — delegates to the cross-platform Node runner.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec node "${ROOT}/scripts/load/run-shop-smoke.mjs" "$@"
