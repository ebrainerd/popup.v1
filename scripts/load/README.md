# Load testing scripts

HTTP smoke tests using [k6](https://k6.io/). These scripts do **not** hit Stripe
checkout or auth-gated routes — safe to run against staging or production for
read-heavy paths only.

## Install k6

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu) — see https://k6.io/docs/get-started/installation/
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A6542BBFC0666A31B6E6F0197
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## shop-smoke.js

Ramps virtual users against `/api/health`, `/`, and optionally `/shop/[id]`.

```bash
# Local dev server
npm run build && npm run start &
BASE_URL=http://localhost:3000 k6 run scripts/load/shop-smoke.js

# Staging or production (use a real published shop id)
BASE_URL=https://yourdomain.com \
SHOP_ID=00000000-0000-0000-0000-000000000000 \
VUS=50 \
DURATION=3m \
k6 run scripts/load/shop-smoke.js
```

### Environment variables

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `BASE_URL` | `http://localhost:3000` | Origin to test |
| `SHOP_ID` | _(empty)_ | If set, also loads `/shop/{SHOP_ID}` |
| `VUS` | `30` | Peak concurrent virtual users |
| `DURATION` | `2m` | Time at peak VUs (k6 duration string) |

### Interpreting results

k6 prints pass/fail for thresholds at the end. Start with `VUS=20`, increase
until p95 latency or error rate degrades — that is your rough HTTP ceiling.

Realtime (Supabase), LiveKit, and checkout require separate tests; see
`docs/PRODUCTION_READINESS.md`.
