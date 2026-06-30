"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useShopOpen } from "@/hooks/use-shop-open";

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
    void fetch(`/api/shop/${shopId}/auto-queue-auctions`, { method: "POST" }).then(() => {
      router.refresh();
    });
  }, [shopOpen, shopId, router]);

  return null;
}
