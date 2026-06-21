"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { releaseMyHolds } from "@/app/shop/checkout-actions";

/**
 * When a buyer cancels Stripe Checkout and lands back on the shop with
 * `?checkout=canceled`, immediately release their inventory hold so the item
 * doesn't appear sold out, then clean the URL.
 */
export function ReleaseHoldOnCancel({ shopId }: { shopId: string }) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      await releaseMyHolds(shopId);
      router.replace(`/shop/${shopId}`);
      router.refresh();
    })();
  }, [shopId, router]);

  return null;
}
