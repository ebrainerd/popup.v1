"use client";

import { useNow } from "@/components/countdown";
import { deriveShopStatus } from "@/lib/utils";

/** Client-side shop open state that updates when the schedule elapses. */
export function useShopOpen(startAt: string, endAt: string, fallback: boolean): boolean {
  const now = useNow();
  if (now === null) return fallback;
  return deriveShopStatus(startAt, endAt, new Date(now)) === "open";
}
