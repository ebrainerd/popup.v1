import { test, expect } from "@playwright/test";

/**
 * Smoke tests against a placeholder backend. These validate routing, SSR,
 * the auth guard (proxy), and error handling without needing live services.
 * Full data-driven flows (checkout, chat) require a seeded staging env — see
 * docs/TESTING.md.
 */

test("home renders the hero and Happening Now feed", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: /shops that open/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Happening Now" })).toBeVisible();
});

test("explore page has filters and sort", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByRole("link", { name: /live stream/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /opening soon/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /popular/i }).first()).toBeVisible();
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
