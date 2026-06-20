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
