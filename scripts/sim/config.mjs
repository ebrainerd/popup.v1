/**
 * Local sim configuration with hard safety rails.
 * Only 127.0.0.1 / localhost Supabase URLs are permitted.
 */

export const SUPABASE_URL =
  process.env.SIM_SUPABASE_URL ?? "http://127.0.0.1:54321";

export const SUPABASE_ANON_KEY =
  process.env.SIM_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SIM_SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export const SELLER_PASSWORD = "sim-seller-pass";
export const BUYER_PASSWORD = "sim-buyer-pass";

export const CRON_SECRET =
  process.env.SIM_CRON_SECRET ?? process.env.CRON_SECRET ?? "sim-cron-secret";

/** Always hit the local Next server — never injected hosted NEXT_PUBLIC_SITE_URL. */
export const SIM_SITE_URL =
  process.env.SIM_SITE_URL ?? "http://127.0.0.1:3000";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

/**
 * Throw unless the configured Supabase URL points at a local stack.
 */
export function assertLocalOnly(url = SUPABASE_URL) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`sim: invalid Supabase URL: ${url}`);
  }

  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `sim: refusing non-local Supabase URL "${url}" — wipe-OK local stack only (127.0.0.1 / localhost)`,
    );
  }
}

/** Refuse hosted site URLs for cron / app probes. */
export function assertLocalSiteUrl(url = SIM_SITE_URL) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`sim: invalid site URL: ${url}`);
  }
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `sim: refusing non-local site URL "${url}" — use SIM_SITE_URL=http://127.0.0.1:3000`,
    );
  }
}

/**
 * Stripe checkout mode for sim runs.
 * - `stripe_test` when STRIPE_SECRET_KEY is set (must be sk_test_*)
 * - `seeded` when Stripe is unset (orders seeded via service role)
 */
export function assertStripeTestOrSkip() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    return { checkoutMode: "seeded" };
  }
  if (!key.startsWith("sk_test_")) {
    throw new Error(
      "sim: STRIPE_SECRET_KEY must start with sk_test_ (refusing live Stripe keys)",
    );
  }
  return { checkoutMode: "stripe_test" };
}

/** Promise-based delay for auction waits / soak pacing. */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
