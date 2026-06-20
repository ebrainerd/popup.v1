"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Buy Now entry point.
 * - Guests are routed to login (purchase requires an account).
 * - Authed buyers will be sent to Stripe Checkout once payments land
 *   (Milestone 3). For now it surfaces a clear "coming soon" notice.
 */
export function BuyButton({
  shopId,
  productId,
  isOpen,
  soldOut,
  isAuthed,
}: {
  shopId: string;
  productId: string;
  isOpen: boolean;
  soldOut: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState(false);

  if (soldOut) {
    return (
      <Button size="sm" disabled>
        Sold out
      </Button>
    );
  }
  if (!isOpen) {
    return (
      <Button size="sm" variant="outline" disabled>
        Shop closed
      </Button>
    );
  }

  function onClick() {
    if (!isAuthed) {
      router.push(
        `/login?redirectTo=${encodeURIComponent(`/shop/${shopId}`)}#product-${productId}`,
      );
      return;
    }
    setNotice(true);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={onClick}>
        <ShoppingBag className="size-4" />
        Buy now
      </Button>
      {notice && (
        <span className="text-right text-[11px] text-muted-foreground">
          Checkout opens with payments (Milestone 3)
        </span>
      )}
    </div>
  );
}
