import { describe, expect, it } from "vitest";
import { arePayoutsConnected, isStripePaymentsRequired } from "@/lib/payments";

describe("payments", () => {
  it("treats payouts as connected when Stripe is not configured", () => {
    const prev = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;

    expect(isStripePaymentsRequired()).toBe(false);
    expect(arePayoutsConnected({ stripe_onboarded: false })).toBe(true);

    process.env.STRIPE_SECRET_KEY = prev;
  });

  it("requires a single profile-level Stripe connection when configured", () => {
    const prev = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_test_example";

    expect(isStripePaymentsRequired()).toBe(true);
    expect(arePayoutsConnected({ stripe_onboarded: false })).toBe(false);
    expect(arePayoutsConnected({ stripe_onboarded: true })).toBe(true);

    process.env.STRIPE_SECRET_KEY = prev;
  });
});
