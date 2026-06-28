#!/usr/bin/env node
/**
 * Run k6 shop smoke test from a live shop URL (Windows / macOS / Linux).
 *
 * Usage:
 *   node scripts/load/run-shop-smoke.mjs https://www.popupdrop.co/shop/<uuid>
 *   npm run load:shop-smoke -- https://www.popupdrop.co/shop/<uuid>
 *
 * Env: VUS=50 DURATION=3m
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const K6_SCRIPT = join(__dirname, "shop-smoke.js");

const shopUrlArg = process.argv[2] ?? process.env.SHOP_URL ?? "";
const vus = process.env.VUS ?? "30";
const duration = process.env.DURATION ?? "2m";

function usage() {
  console.error(`
Usage: npm run load:shop-smoke -- <shop-url>

  shop-url  Published shop URL, e.g.
            https://www.popupdrop.co/shop/00000000-0000-0000-0000-000000000000

Optional env: VUS=50 DURATION=3m

Install Grafana k6 (not pip):
  Windows:  winget install GrafanaLabs.k6
  macOS:    brew install k6
  https://grafana.com/docs/k6/latest/set-up/install-k6/
`);
  process.exit(1);
}

function parseShopUrl(raw) {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    console.error("error: invalid shop URL");
    process.exit(1);
  }

  const match = parsed.pathname.match(
    /\/shop\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/,
  );
  if (!match) {
    console.error(
      "error: URL must include /shop/<uuid>\n" +
        "  e.g. https://www.popupdrop.co/shop/00000000-0000-0000-0000-000000000000",
    );
    process.exit(1);
  }

  return {
    baseUrl: `${parsed.protocol}//${parsed.host}`,
    shopId: match[1],
  };
}

function findK6() {
  const cmd = process.platform === "win32" ? "k6.exe" : "k6";
  const probe = spawnSync(cmd, ["version"], { encoding: "utf8", shell: process.platform === "win32" });
  if (probe.status === 0) return cmd;
  return null;
}

if (!shopUrlArg) usage();
if (!existsSync(K6_SCRIPT)) {
  console.error(`error: missing ${K6_SCRIPT}`);
  process.exit(1);
}

const k6 = findK6();
if (!k6) {
  console.error("error: Grafana k6 is not installed (pip install k6 is the wrong package).");
  console.error("  Windows: winget install GrafanaLabs.k6");
  console.error("  macOS:   brew install k6");
  console.error("  Docs:    https://grafana.com/docs/k6/latest/set-up/install-k6/");
  process.exit(1);
}

const { baseUrl, shopId } = parseShopUrl(shopUrlArg);

console.log(`→ Base URL:  ${baseUrl}`);
console.log(`→ Shop ID:   ${shopId}`);
console.log(`→ Peak VUs:  ${vus} for ${duration}`);
console.log("→ Running k6…\n");

const result = spawnSync(
  k6,
  ["run", K6_SCRIPT],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      BASE_URL: baseUrl,
      SHOP_ID: shopId,
      VUS: vus,
      DURATION: duration,
    },
  },
);

process.exit(result.status ?? 1);
