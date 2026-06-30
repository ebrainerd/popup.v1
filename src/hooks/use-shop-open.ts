"use client";

import { useNow } from "@/components/countdown";
import { deriveShopStatus, type ShopStatus } from "@/lib/utils";

/** Client-side shop open state that updates when the schedule elapses. */
export function useShopOpen(startAt: string, endAt: string, fallback: boolean): boolean {
  const now = useNow();
  if (now === null) return fallback;
  return deriveShopStatus(startAt, endAt, new Date(now)) === "open";
}

export type ShopPhaseFallback = {
  isOpen: boolean;
  isScheduled: boolean;
};

/** Client-side schedule phase for hero shrink and section reorder at `start_at`. */
export function useShopPhase(
  startAt: string,
  endAt: string,
  fallback: ShopPhaseFallback,
): { isOpen: boolean; isScheduled: boolean; status: ShopStatus } {
  const now = useNow();
  if (now === null) {
    return {
      isOpen: fallback.isOpen,
      isScheduled: fallback.isScheduled,
      status: fallback.isScheduled ? "scheduled" : fallback.isOpen ? "open" : "ended",
    };
  }
  const status = deriveShopStatus(startAt, endAt, new Date(now));
  return {
    isOpen: status === "open",
    isScheduled: status === "scheduled",
    status,
  };
}
