"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useShopOpen } from "@/hooks/use-shop-open";
import { bestEffortPost } from "@/lib/best-effort-fetch";

/** Queues auction pre-bids when the shop opens for buyers already on the page. */
export function AuctionAutoQueueTrigger({
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
  const router = useRouter();
  const shopOpen = useShopOpen(startAt, endAt, initiallyOpen);
  const firedRef = useRef(initiallyOpen);

  useEffect(() => {
    if (!shopOpen || firedRef.current) return;
    firedRef.current = true;
    let cancelled = false;

    async function fire(attempt: number) {
      const ok = await bestEffortPost(`/api/shop/${shopId}/auto-queue-auctions`);
      if (cancelled) return;
      if (ok) {
        router.refresh();
        return;
      }
      if (attempt < 1) {
        await new Promise((r) => setTimeout(r, 1500));
        if (!cancelled) await fire(attempt + 1);
      }
      // On final failure leave fired=true — next page load / SSR auto-queues.
    }

    void fire(0);
    return () => {
      cancelled = true;
    };
  }, [shopOpen, shopId, router]);

  return null;
}
