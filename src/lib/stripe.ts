import "server-only";
import Stripe from "stripe";

let cached: Stripe | null = null;

/** Returns a configured Stripe client, or null if no secret key is set. */
export function getStripe(): Stripe | null {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cached = new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
  return cached;
}

/** Platform commission in basis points (default 9% = 900 bps). */
export function platformFeeBps(): number {
  const raw = Number(process.env.PLATFORM_FEE_BPS);
  return Number.isFinite(raw) && raw >= 0 && raw <= 10000 ? raw : 900;
}

/** Platform fee (in cents) for a given gross amount (in cents). */
export function platformFee(amountCents: number): number {
  return Math.round((amountCents * platformFeeBps()) / 10000);
}

/** Hours funds are held after a seller marks an order shipped (default 72h). */
export function releaseDelayHours(): number {
  const raw = Number(process.env.RELEASE_DELAY_HOURS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 72;
}
