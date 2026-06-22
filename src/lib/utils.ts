import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an integer number of cents as a localized currency string. */
export function formatCurrency(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** Convert a dollar amount (string or number) into integer cents. */
export function toCents(amount: string | number): number {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

export type ShopStatus = "scheduled" | "open" | "ended";

/** Best-effort carrier tracking URL from a carrier name + tracking number. */
export function carrierTrackingUrl(
  carrier: string | null,
  tracking: string | null,
): string | null {
  if (!tracking) return null;
  const t = encodeURIComponent(tracking);
  const c = (carrier ?? "").toLowerCase();
  if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`;
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${t}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${t}`;
  if (c.includes("dhl")) return `https://www.dhl.com/en/express/tracking.html?AWB=${t}`;
  // Unknown carrier: a generic package-tracking aggregator.
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier ?? ""} tracking ${tracking}`)}`;
}

/** Derive a shop's live-state from its schedule. */
export function deriveShopStatus(
  startAt: string | Date,
  endAt: string | Date,
  now: Date = new Date(),
): ShopStatus {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (now < start) return "scheduled";
  if (now >= end) return "ended";
  return "open";
}
