import { test, expect } from "@playwright/test";

/**
 * Smoke tests against a placeholder backend. These validate routing, SSR,
 * the auth guard (proxy), and error handling without needing live services.
 * Full data-driven flows (checkout, chat) require a seeded staging env — see
 * docs/TESTING.md.
 */

test("home renders invite-only seller positioning", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: /shops that live for the moment\./i }),
  ).toBeVisible();
  await expect(page.getByText(/live streaming, auctions & real-time chat/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /create shop/i }).first()).toBeVisible();
  await expect(page.getByText(/got a creator's popup link/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /how it works/i })).toBeVisible();
});

test("explore shows invite-only holding page", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByRole("heading", { name: /invite-link drops only/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /live stream/i })).toHaveCount(0);
});

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText(/welcome back/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
});

test("dashboard redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("unknown shop returns the 404 page", async ({ page }) => {
  const res = await page.goto("/shop/00000000-0000-0000-0000-000000000000");
  expect(res?.status()).toBe(404);
  await expect(page.getByText(/this shop has closed/i)).toBeVisible();
});

test("header has no marketing nav links on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const header = page.locator("header");
  await expect(header.getByRole("button", { name: /open menu/i })).toHaveCount(0);
  await expect(header.getByRole("link", { name: "How it works" })).toHaveCount(0);
  await expect(header.getByRole("link", { name: "About" })).toHaveCount(0);
});
