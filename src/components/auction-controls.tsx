"use client";

import { useMemo, useState, useTransition } from "react";
import { Gavel, Play, X, RotateCcw } from "lucide-react";
import { useShopRoom, useShopEvent } from "@/components/shop-room";
import {
  queueAuction,
  startAuction,
  cancelAuction,
} from "@/app/shop/auction-actions";
import {
  ROOM_EVENTS,
  type AuctionStartedBroadcast,
  type AuctionQueuedBroadcast,
  type AuctionBidBroadcast,
  type AuctionEndedBroadcast,
  type FlashItemBroadcast,
  type FlashPriceBroadcast,
  type FlashClearBroadcast,
} from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/database.types";
import type { AuctionRunWithProduct } from "@/lib/auctions";
import { formatCurrency } from "@/lib/utils";
import { productDisplayPrice } from "@/lib/product-pricing";

export function AuctionControls({
  shopId,
  products,
  runs: initialRuns,
}: {
  shopId: string;
  products: Product[];
  runs: AuctionRunWithProduct[];
}) {
  const { emit } = useShopRoom();
  const [productList, setProductList] = useState(products);
  const [runs, setRuns] = useState(initialRuns);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useShopEvent(ROOM_EVENTS.flashItem, (payload) => {
    const item = payload as FlashItemBroadcast;
    if (item.sale_type !== "auction") return;
    setProductList((prev) =>
      prev.some((p) => p.id === item.id) ? prev : [...prev, item as Product],
    );
  });

  useShopEvent(ROOM_EVENTS.flashPrice, (payload) => {
    const { productId, discountPrice, auctionStartingBid } = payload as FlashPriceBroadcast;
    setProductList((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              discount_price: discountPrice,
              auction_starting_bid: auctionStartingBid ?? discountPrice,
            }
          : p,
      ),
    );
    setRuns((prev) =>
      prev.map((r) =>
        r.product_id === productId && r.bid_count === 0
          ? {
              ...r,
              starting_bid: auctionStartingBid ?? discountPrice,
              current_bid: auctionStartingBid ?? discountPrice,
            }
          : r,
      ),
    );
  });

  useShopEvent(ROOM_EVENTS.flashClear, (payload) => {
    const { productId, restoreAuctionStartingBid } = payload as FlashClearBroadcast;
    setProductList((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              discount_price: null,
              auction_starting_bid: restoreAuctionStartingBid ?? p.price,
            }
          : p,
      ),
    );
    setRuns((prev) =>
      prev.map((r) =>
        r.product_id === productId && r.bid_count === 0
          ? {
              ...r,
              starting_bid: restoreAuctionStartingBid ?? r.starting_bid,
              current_bid: restoreAuctionStartingBid ?? r.current_bid,
            }
          : r,
      ),
    );
  });

  const auctionProducts = useMemo(
    () => productList.filter((p) => p.sale_type === "auction"),
    [productList],
  );

  // Highlight the run that needs the seller's attention: a live lot first,
  // then an unpaid win, then whatever is queued (matches pickPrimaryAuctionRun).
  const ACTIVE_PRIORITY: Record<string, number> = { live: 0, awaiting_payment: 1, queued: 2 };
  const activeRun = [...runs]
    .filter((r) => r.status in ACTIVE_PRIORITY)
    .sort((a, b) => (ACTIVE_PRIORITY[a.status] ?? 3) - (ACTIVE_PRIORITY[b.status] ?? 3))[0];

  function refreshRun(id: string, patch: Partial<AuctionRunWithProduct>) {
    setRuns((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  // Keep the seller's queue in sync with room activity (bids, endings,
  // payment expiry) without a manual refresh.
  useShopEvent(ROOM_EVENTS.auctionBid, (payload) => {
    const p = payload as AuctionBidBroadcast;
    refreshRun(p.auctionId, {
      current_bid: p.currentBid,
      bid_count: p.bidCount,
      current_winner_id: p.currentWinnerId,
      ends_at: p.endsAt,
    });
  });

  useShopEvent(ROOM_EVENTS.auctionEnded, (payload) => {
    const p = payload as AuctionEndedBroadcast;
    refreshRun(p.auctionId, {
      status: p.status,
      ...(p.checkoutExpiresAt ? { checkout_expires_at: p.checkoutExpiresAt } : {}),
    });
  });

  function queue(productId: string) {
    setError(null);
    startTransition(async () => {
      const res = await queueAuction(productId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const product = auctionProducts.find((p) => p.id === productId);
      if (!product) return;
      const newRun: AuctionRunWithProduct = {
        id: res.data?.auctionId as string,
        shop_id: shopId,
        product_id: productId,
        seller_id: "",
        status: "queued",
        starting_bid: product.auction_starting_bid ?? product.price,
        min_increment: product.auction_min_increment ?? 100,
        current_bid: product.auction_starting_bid ?? product.price,
        current_winner_id: null,
        winning_bid_id: null,
        bid_count: 0,
        starts_at: null,
        ends_at: null,
        soft_close_seconds: 10,
        sudden_death: product.auction_sudden_death,
        checkout_expires_at: null,
        stripe_session_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        product,
      };
      setRuns((prev) => [newRun, ...prev.filter((r) => r.product_id !== productId)]);
      emit(ROOM_EVENTS.auctionQueued, {
        auctionId: newRun.id,
        productId,
        productTitle: product.title,
        startingBid: newRun.starting_bid,
        minIncrement: newRun.min_increment,
        allowPrebids: product.auction_allow_prebids,
        suddenDeath: product.auction_sudden_death,
      } satisfies AuctionQueuedBroadcast);
    });
  }

  function start(run: AuctionRunWithProduct) {
    setError(null);
    startTransition(async () => {
      const res = await startAuction(run.id, shopId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const duration = run.product.auction_duration_seconds ?? 60;
      const endsAt = new Date(Date.now() + duration * 1000).toISOString();
      refreshRun(run.id, { status: "live", starts_at: new Date().toISOString(), ends_at: endsAt });
      const payload: AuctionStartedBroadcast = {
        auctionId: run.id,
        productId: run.product_id,
        productTitle: run.product.title,
        startingBid: run.starting_bid,
        endsAt,
        suddenDeath: run.sudden_death,
        // Pre-bids carry into the live round; keep every client's state intact.
        currentBid: run.current_bid,
        bidCount: run.bid_count,
        nextMinimumBid:
          run.bid_count === 0 ? run.starting_bid : run.current_bid + run.min_increment,
        currentWinnerId: run.current_winner_id,
      };
      emit(ROOM_EVENTS.auctionStarted, payload);
    });
  }

  function cancel(runId: string) {
    setError(null);
    startTransition(async () => {
      const res = await cancelAuction(runId, shopId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRuns((prev) =>
        prev.map((r) => (r.id === runId ? { ...r, status: "canceled" as const } : r)),
      );
    });
  }

  function rerun(productId: string) {
    queue(productId);
  }

  if (auctionProducts.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Gavel className="size-5 text-primary" />
        <h3 className="font-semibold text-foreground">Auction queue</h3>
        <span className="text-xs text-muted-foreground">Start lots live in the room</span>
      </div>

      {activeRun && (
        <div className="mb-4 rounded-lg border border-border bg-background p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{activeRun.product.title}</p>
              <p className="text-sm text-muted-foreground">
                {activeRun.status === "queued"
                  ? "Queued — ready to start"
                  : activeRun.status === "live"
                    ? `Live · ${formatCurrency(activeRun.current_bid)} · ${activeRun.bid_count} bids`
                    : `Awaiting winner checkout · ${formatCurrency(activeRun.current_bid)}`}
              </p>
            </div>
            <StatusBadge status={activeRun.status} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeRun.status === "queued" && (
              <>
                <Button size="sm" onClick={() => start(activeRun)} disabled={pending}>
                  <Play className="size-4" /> Start auction
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cancel(activeRun.id)}
                  disabled={pending || activeRun.bid_count > 0}
                >
                  <X className="size-4" /> Cancel
                </Button>
              </>
            )}
            {activeRun.status === "live" && activeRun.bid_count === 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => cancel(activeRun.id)}
                disabled={pending}
              >
                <X className="size-4" /> Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {auctionProducts.map((p) => {
          const run = runs.find(
            (r) =>
              r.product_id === p.id &&
              !["canceled", "paid", "payment_expired"].includes(r.status),
          );
          const lastEnded = runs.find(
            (r) =>
              r.product_id === p.id &&
              ["unsold", "payment_expired"].includes(r.status),
          );
          const isActive = run && ["queued", "live", "awaiting_payment"].includes(run.status);

          return (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  Starting {formatCurrency(productDisplayPrice(p))}
                </p>
              </div>
              <div className="flex gap-2">
                {!isActive && !lastEnded && (
                  <Button size="sm" variant="outline" onClick={() => queue(p.id)} disabled={pending}>
                    Add to queue
                  </Button>
                )}
                {lastEnded && !isActive && (
                  <Button size="sm" variant="outline" onClick={() => rerun(p.id)} disabled={pending}>
                    <RotateCcw className="size-4" /> Re-run
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {error && <p className="mt-2 text-sm text-live">{error}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "live" ? "live" : status === "queued" ? "accent" : ("muted" as const);
  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
}
