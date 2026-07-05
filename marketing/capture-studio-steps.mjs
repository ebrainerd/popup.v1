#!/usr/bin/env node
/**
 * Capture each Shop Studio tab for the marketing walkthrough video.
 *
 *   node marketing/capture-studio-steps.mjs
 *
 * Requires a running server at MARKETING_BASE_URL (default localhost:3000).
 */
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "screenshots");
const BASE = process.env.MARKETING_BASE_URL ?? "http://localhost:3000";
const VIEWPORT = { width: 1440, height: 900 };

const TABS = [
  { id: "shop", file: "step-shop", label: /^shop$/i },
  { id: "products", file: "step-products", label: /^products$/i },
  { id: "stream", file: "step-stream", label: /^stream$/i },
  { id: "style", file: "step-design", label: /^design$/i },
  { id: "launch", file: "step-launch", label: /^launch$/i },
];

function loadState() {
  const path = join(__dirname, "demo-state.json");
  if (!existsSync(path)) throw new Error("Run `node marketing/seed-demo.mjs` first.");
  return JSON.parse(readFileSync(path, "utf8"));
}

async function login(page, state) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(state.sellerEmail);
  await page.getByLabel("Password").fill(state.sellerPassword);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

async function waitForImages(page) {
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.locator('img[src*="/marketing/demo/"]').first().waitFor({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function main() {
  const state = loadState();
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });

  await login(page, state);
  await page.goto(`${BASE}${state.studioSetupUrl}`);
  await waitForImages(page);

  for (const tab of TABS) {
    const btn = page.getByRole("button", { name: tab.label });
    await btn.click();
    await page.waitForTimeout(1000);
    await waitForImages(page);
    const path = join(OUT_DIR, `${tab.file}.png`);
    await page.screenshot({ path, fullPage: false });
    console.log(`  saved ${path}`);
  }

  await browser.close();
  console.log("Studio step screenshots captured.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
