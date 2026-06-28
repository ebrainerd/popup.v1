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

export type PublishedShopWindow = {
  /** Time-based phase from start_at / end_at (ignores draft). */
  schedule: ShopStatus;
  isDraft: boolean;
  isPublished: boolean;
  /** Published and within the open window — buyers can shop. */
  isOpen: boolean;
  isScheduled: boolean;
  isEnded: boolean;
};

/** Combine DB status (draft vs published) with the schedule window. */
export function derivePublishedShopWindow(
  shop: { status: string; start_at: string; end_at: string },
  now: Date = new Date(),
): PublishedShopWindow {
  const schedule = deriveShopStatus(shop.start_at, shop.end_at, now);
  const isDraft = shop.status === "draft";
  return {
    schedule,
    isDraft,
    isPublished: !isDraft,
    isOpen: !isDraft && schedule === "open",
    isScheduled: !isDraft && schedule === "scheduled",
    isEnded: !isDraft && schedule === "ended",
  };
}

/**
 * Compute schedule timestamps when a seller ends a shop early.
 * Preserves orders/history; only closes the purchase window.
 */
export function computeEndShopTimes(
  startAt: string | Date,
  endAt: string | Date,
  now: Date = new Date(),
): { start_at: string; end_at: string } {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const nowIso = now.toISOString();

  if (now >= end) {
    return { start_at: start.toISOString(), end_at: end.toISOString() };
  }

  // Scheduled but not yet open — collapse the window so end_at > start_at.
  if (now < start) {
    return {
      start_at: new Date(now.getTime() - 60_000).toISOString(),
      end_at: nowIso,
    };
  }

  return { start_at: start.toISOString(), end_at: nowIso };
}

/** Human-readable duration for countdown-style copy, e.g. "2h 14m" or "3d 5h". */
export function formatDurationMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}
