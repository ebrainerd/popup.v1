"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/app/shop/checkout-actions";
import {
  closeStripeCheckoutTab,
  navigateStripeCheckout,
  openCheckoutTab,
} from "@/lib/open-stripe-checkout";

/**
 * Buy Now entry point.
 * - Guests are routed to login (purchase requires an account).
 * - Authed buyers start a Stripe Checkout session and are redirected to it.
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
    setError(null);
    if (!isAuthed) {
      router.push(`/login?redirectTo=${encodeURIComponent(`/shop/${shopId}`)}`);
      return;
    }
    const tab = openCheckoutTab();
    startTransition(async () => {
      const res = await createCheckoutSession(productId);
      if (res.ok) {
        navigateStripeCheckout(tab, res.url);
      } else {
        closeStripeCheckoutTab(tab);
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-1 max-sm:w-full sm:w-auto sm:items-end">
      <Button size="sm" className="w-full sm:w-auto" onClick={onClick} disabled={pending}>
        <ShoppingBag className="size-4" />
        {pending ? "Starting…" : "Buy now"}
      </Button>
      {error && <span className="text-right text-[11px] text-live">{error}</span>}
    </div>
  );
}
