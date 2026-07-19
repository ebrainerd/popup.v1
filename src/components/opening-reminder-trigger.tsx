"use client";

import { useEffect, useRef } from "react";
import { useShopOpen } from "@/hooks/use-shop-open";
import { bestEffortPost } from "@/lib/best-effort-fetch";

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
    let cancelled = false;

    async function fire(attempt: number) {
      const ok = await bestEffortPost(`/api/shop/${shopId}/opening-reminders`);
      if (ok || cancelled) return;
      // One quick retry for transient Safari / radio blips; cron still covers the rest.
      if (attempt < 1) {
        await new Promise((r) => setTimeout(r, 1500));
        if (!cancelled) await fire(attempt + 1);
      }
    }

    void fire(0);
    return () => {
      cancelled = true;
    };
  }, [shopOpen, shopId]);

  return null;
}
