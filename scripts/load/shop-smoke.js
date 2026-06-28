/**
 * Minimal HTTP load smoke for PopUp.
 *
 * Usage:
 *   BASE_URL=https://your-staging.vercel.app SHOP_ID=<uuid> k6 run scripts/load/shop-smoke.js
 *
 * Install k6: https://k6.io/docs/get-started/installation/
 */

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const SHOP_ID = __ENV.SHOP_ID || "";
const PEAK_VUS = Number(__ENV.VUS || 30);
const HOLD = __ENV.DURATION || "2m";

export const options = {
  stages: [
    { duration: "30s", target: Math.max(1, Math.floor(PEAK_VUS / 3)) },
    { duration: HOLD, target: PEAK_VUS },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<3000"],
  },
};

export default function () {
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, {
    "health status 200": (r) => r.status === 200,
    "health body ok": (r) => {
      try {
        return JSON.parse(r.body).status === "ok";
      } catch {
        return false;
      }
    },
  });

  const home = http.get(`${BASE_URL}/`);
  check(home, { "home status 200": (r) => r.status === 200 });

  if (SHOP_ID) {
    const shop = http.get(`${BASE_URL}/shop/${SHOP_ID}`);
    check(shop, { "shop status 200": (r) => r.status === 200 });
  }

  sleep(1);
}
