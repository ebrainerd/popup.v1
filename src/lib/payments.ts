import "server-only";

import { getStripe } from "@/lib/stripe";

/** True when Stripe is configured and sellers must connect payouts. */
export function isStripePaymentsRequired(): boolean {
  return Boolean(getStripe());
}

/** Payout status is stored once per seller profile, not per shop. */
export function arePayoutsConnected(profile: { stripe_onboarded: boolean }): boolean {
  return profile.stripe_onboarded || !isStripePaymentsRequired();
}
