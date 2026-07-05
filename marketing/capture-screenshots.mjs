#!/usr/bin/env node
/**
 * Capture marketing screenshots against a seeded local server.
 *
 *   MARKETING_SUPABASE_URL=http://127.0.0.1:54321 node marketing/seed-demo.mjs
 *   node marketing/capture-screenshots.mjs
 *
 * Uses `next start` (production) to avoid the dev error overlay on Studio pages.
 */
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "screenshots");
const BASE = process.env.MARKETING_BASE_URL ?? "http://localhost:3000";
const VIEWPORT = { width: 1440, height: 900 };

const LOCAL_ENV = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
  SUPABASE_SERVICE_ROLE_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
  NEXT_PUBLIC_SITE_URL: BASE,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
  STRIPE_SECRET_KEY: "",
  NEXT_PUBLIC_MARKETING_DEMO: "1",
  NODE_ENV: "production",
};

function loadState() {
  const path = join(__dirname, "demo-state.json");
  if (!existsSync(path)) {
    throw new Error("Run `node marketing/seed-demo.mjs` first.");
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

async function waitForServer(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server not ready at ${url}`);
}

async function startProductionServer() {
  console.log("Building production bundle…");
  await new Promise((resolve, reject) => {
    const build = spawn("npm", ["run", "build"], {
      cwd: join(__dirname, ".."),
      env: LOCAL_ENV,
      stdio: "inherit",
    });
    build.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`build failed: ${code}`))));
  });

  console.log("Starting production server…");
  const server = spawn("npm", ["run", "start"], {
    cwd: join(__dirname, ".."),
    env: { ...LOCAL_ENV, PORT: "3000" },
    stdio: "pipe",
  });

  await waitForServer(BASE);
  return server;
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
  await page.waitForTimeout(1500);
}

async function capture(page, name) {
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  saved ${path}`);
}

async function main() {
  const state = loadState();
  mkdirSync(OUT_DIR, { recursive: true });

  const server = await startProductionServer();

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    console.log("Logging in as demo seller…");
    await login(page, state);

    console.log("Dashboard…");
    await page.goto(`${BASE}/dashboard`);
    await waitForImages(page);
    await capture(page, "dashboard");

    console.log("Sales…");
    await page.goto(`${BASE}/dashboard/sales`);
    await waitForImages(page);
    await capture(page, "sales");

    console.log("Create shop (Studio)…");
    await page.goto(`${BASE}${state.studioSetupUrl ?? "/dashboard/shops/new"}`);
    await waitForImages(page);
    const productsTab = page.getByRole("button", { name: /^products$/i });
    if (await productsTab.isVisible()) {
      await productsTab.click();
      await page.waitForTimeout(1000);
    }
    await capture(page, "create-shop");

    console.log("Studio steps…");
    const stepTabs = [
      { file: "step-shop", label: /^shop$/i },
      { file: "step-products", label: /^products$/i },
      { file: "step-stream", label: /^stream$/i },
      { file: "step-design", label: /^design$/i },
      { file: "step-launch", label: /^launch$/i },
    ];
    for (const tab of stepTabs) {
      await page.getByRole("button", { name: tab.label }).click();
      await page.waitForTimeout(1000);
      await waitForImages(page);
      await capture(page, tab.file);
    }

    console.log("Live shop (buyer view)…");
    await context.clearCookies();
    await page.goto(`${BASE}${state.liveShopUrl}`);
    await waitForImages(page);
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(1500);
    await capture(page, "live-shop");

    await browser.close();
    console.log(`\nDone — screenshots in ${OUT_DIR}`);
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
