"use client";

import { useEffect, useRef } from "react";
import { useShopOpen } from "@/hooks/use-shop-open";

/** Triggers opening email/push reminders as soon as the shop opens (best-effort). */
export function OpeningReminderTrigger({
  shopId,
  startAt,
  endAt,
  initiallyOpen,
}: {
  shopId: string;
  startAt: string;
  endAt: string;
  initiallyOpen: boolean;
}) {
  const shopOpen = useShopOpen(startAt, endAt, initiallyOpen);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!shopOpen || firedRef.current) return;
    firedRef.current = true;
    void fetch(`/api/shop/${shopId}/opening-reminders`, { method: "POST" });
  }, [shopOpen, shopId]);

  return null;
}
