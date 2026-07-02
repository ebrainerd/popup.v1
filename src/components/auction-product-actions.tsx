"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gavel } from "lucide-react";
import { useShopRoom, useShopEvent } from "@/components/shop-room";
import { placeAuctionBid } from "@/app/shop/auction-actions";
import { createAuctionCheckoutSession } from "@/app/shop/checkout-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@/lib/database.types";
import type { AuctionRunWithProduct } from "@/lib/auctions";
import {
  ROOM_EVENTS,
  type AuctionBidBroadcast,
  type AuctionEndedBroadcast,
  type AuctionQueuedBroadcast,
  type AuctionStartedBroadcast,
} from "@/lib/realtime";
import { formatCurrency } from "@/lib/utils";

type AuctionState = {
  run: AuctionRunWithProduct;
  nextMinimumBid: number;
  viewerState: "winning" | "outbid" | "none";
  yourMaxBid: number | null;
};

export function AuctionProductActions({
  product,
  shopId,
  shopOpen,
  isAuthed,
  isOwner,
  userId,
  initial,
}: {
  product: Product;
  shopId: string;
  shopOpen: boolean;
  isAuthed: boolean;
  isOwner: boolean;
  userId: string | null;
  initial: AuctionState | null;
}) {
  const router = useRouter();
  const { emit, currentUser } = useShopRoom();
  const [state, setState] = useState<AuctionState | null>(
    initial?.run.product_id === product.id ? initial : null,
  );
  const [ended, setEnded] = useState<AuctionEndedBroadcast | null>(null);
  const [maxBid, setMaxBid] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const applyBid = useCallback((payload: AuctionBidBroadcast) => {
    setState((prev) => {
      if (!prev || prev.run.id !== payload.auctionId) return prev;
      return {
        ...prev,
        run: {
          ...prev.run,
          status: payload.status as typeof prev.run.status,
          current_bid: payload.currentBid,
          bid_count: payload.bidCount,
          current_winner_id: payload.currentWinnerId,
          ends_at: payload.endsAt,
        },
        nextMinimumBid: payload.nextMinimumBid,
      };
    });
  }, []);

  useShopEvent(ROOM_EVENTS.auctionQueued, (payload) => {
    const p = payload as AuctionQueuedBroadcast;
    if (p.productId !== product.id) return;
    setEnded(null);
    setState({
      run: {
        id: p.auctionId,
        shop_id: shopId,
        product_id: p.productId,
        seller_id: "",
        status: "queued",
        starting_bid: p.startingBid,
        min_increment: p.minIncrement,
        current_bid: p.startingBid,
        current_winner_id: null,
        winning_bid_id: null,
        bid_count: 0,
        starts_at: null,
        ends_at: null,
        soft_close_seconds: 10,
        sudden_death: p.suddenDeath,
        checkout_expires_at: null,
        stripe_session_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        product,
      },
      nextMinimumBid: p.startingBid,
      viewerState: "none",
      yourMaxBid: null,
    });
  });

  useShopEvent(ROOM_EVENTS.auctionStarted, (payload) => {
    const p = payload as AuctionStartedBroadcast;
    if (p.productId !== product.id) return;
    setEnded(null);
    setState((prev) => {
      if (!prev || prev.run.product_id !== product.id) return prev;
      // Pre-bids carry over into the live round: keep bid state and the
      // viewer's own max bid instead of resetting to zero.
      return {
        ...prev,
        run: {
          ...prev.run,
          id: p.auctionId,
          status: "live",
          ends_at: p.endsAt,
          current_bid: p.currentBid ?? prev.run.current_bid,
          bid_count: p.bidCount ?? prev.run.bid_count,
          current_winner_id: p.currentWinnerId ?? prev.run.current_winner_id,
        },
        nextMinimumBid: p.nextMinimumBid ?? prev.nextMinimumBid,
      };
    });
  });

  useShopEvent(ROOM_EVENTS.auctionBid, (payload) => {
    const p = payload as AuctionBidBroadcast;
    if (p.productId !== product.id) return;
    applyBid(p);
    if (userId) {
      setState((s) => {
        if (!s) return s;
        if (p.currentWinnerId === userId) return { ...s, viewerState: "winning" };
        if (s.yourMaxBid) return { ...s, viewerState: "outbid" };
        return s;
      });
    }
  });

  useShopEvent(ROOM_EVENTS.auctionExtended, (payload) => {
    const p = payload as AuctionBidBroadcast;
    if (p.productId === product.id) applyBid(p);
  });

  useShopEvent(ROOM_EVENTS.auctionEnded, (payload) => {
    const p = payload as AuctionEndedBroadcast;
    if (p.productId !== product.id) return;
    setEnded(p);
    setState((prev) => {
      if (!prev || prev.run.id !== p.auctionId) return prev;
      return { ...prev, run: { ...prev.run, status: p.status as typeof prev.run.status } };
    });
  });

  function requireAuth(): boolean {
    if (isAuthed) return true;
    router.push(`/login?redirectTo=${encodeURIComponent(`/shop/${shopId}`)}`);
    return false;
  }

  function placeBid(amountCents: number) {
    if (!state) return;
    if (!requireAuth()) return;
    setError(null);
    startTransition(async () => {
      const res = await placeAuctionBid(state.run.id, amountCents, shopId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const data = res.data as Record<string, unknown>;
      const payload: AuctionBidBroadcast = {
        auctionId: state.run.id,
        productId: product.id,
        status: state.run.status,
        currentBid: data.current_bid as number,
        bidCount: data.bid_count as number,
        currentWinnerId: data.current_winner_id as string | null,
        currentWinnerName:
          currentUser && data.current_winner_id === currentUser.id
            ? currentUser.username
            : null,
        endsAt: data.ends_at as string | null,
        nextMinimumBid: data.next_minimum_bid as number,
        extended: Boolean(data.extended),
      };
      applyBid(payload);
      setState((s) =>
        s
          ? {
              ...s,
              viewerState: (data.viewer_state as AuctionState["viewerState"]) ?? "none",
              yourMaxBid: data.your_max_bid as number,
              nextMinimumBid: data.next_minimum_bid as number,
            }
          : s,
      );
      emit(ROOM_EVENTS.auctionBid, payload);
      if (data.extended) emit(ROOM_EVENTS.auctionExtended, payload);
      setMaxBid("");
    });
  }

  function checkout() {
    if (!state) return;
    startTransition(async () => {
      const res = await createAuctionCheckoutSession(state.run.id);
      if (res.ok) window.location.href = res.url;
      else setError(res.error);
    });
  }

  if (isOwner) {
    return (
      <p className="text-right text-xs text-muted-foreground">
        Auction item — manage bidding from seller tools above.
      </p>
    );
  }

  const run = state?.run;
  const isLive = run?.status === "live";
  const isQueued = run?.status === "queued";
  const isAwaiting =
    run?.status === "awaiting_payment" || ended?.status === "awaiting_payment";
  const isEndedState =
    Boolean(run && !isLive && !isQueued) ||
    Boolean(ended && ["awaiting_payment", "paid", "unsold", "payment_expired"].includes(ended.status));
  const viewerWon =
    isAwaiting &&
    run?.status === "awaiting_payment" &&
    userId === (ended?.winnerId ?? run?.current_winner_id);
  // Pre-bids are open the moment a lot is queued, even before the shop opens.
  const allowBids = Boolean(run) && (isLive || (isQueued && product.auction_allow_prebids));

  if (viewerWon && run) {
    return (
      <div className="flex flex-col items-end gap-2">
        <Button size="sm" onClick={checkout} disabled={pending}>
          {pending ? "Starting…" : "Checkout now"}
        </Button>
        <span className="text-right text-[11px] text-muted-foreground">
          You have 30 minutes to check out before the lot is released.
        </span>
        {error && <span className="text-right text-[11px] text-live">{error}</span>}
      </div>
    );
  }

  if (allowBids && state) {
    return (
      <div className="flex w-full max-w-xs flex-col items-end gap-2">
        <div className="flex flex-wrap items-end justify-end gap-2">
          <Button size="sm" onClick={() => placeBid(state.nextMinimumBid)} disabled={pending}>
            <Gavel className="size-4" />
            Bid {formatCurrency(state.nextMinimumBid)}
          </Button>
          <div className="flex items-end gap-1">
            <Input
              type="number"
              min={state.nextMinimumBid / 100}
              step="0.01"
              placeholder={(state.nextMinimumBid / 100).toFixed(2)}
              value={maxBid}
              onChange={(e) => setMaxBid(e.target.value)}
              className="h-9 w-24"
              aria-label="Max bid in USD"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                const dollars = parseFloat(maxBid);
                if (Number.isNaN(dollars)) {
                  setError("Enter a valid max bid.");
                  return;
                }
                placeBid(Math.round(dollars * 100));
              }}
            >
              Max bid
            </Button>
          </div>
        </div>
        {isQueued && !shopOpen && (
          <span className="text-[11px] font-medium text-accent">
            Pre-bidding is open before the drop starts.
          </span>
        )}
        <span className="text-right text-[11px] text-muted-foreground">
          Bids are binding — win it, pay it (plus shipping).
        </span>
        {state.viewerState === "winning" && isLive && (
          <span className="text-xs font-medium text-primary">You&apos;re winning</span>
        )}
        {state.viewerState === "outbid" && isLive && (
          <span className="text-xs text-live">You were outbid</span>
        )}
        {error && <span className="text-right text-[11px] text-live">{error}</span>}
      </div>
    );
  }

  // The auction has finished (sold, unsold, or checkout window passed):
  // give buyers a clear ending instead of stale pre-bid copy.
  if (isEndedState && run) {
    const soldAmount = ended?.winningBid ?? run.current_bid;
    const status = ended?.status ?? run.status;
    return (
      <div className="flex flex-col items-end gap-1 text-right">
        <Button size="sm" variant="outline" disabled>
          <Gavel className="size-4" />
          Auction ended
        </Button>
        <span className="text-[11px] text-muted-foreground">
          {status === "unsold"
            ? "No winner this run — the seller can run it again."
            : status === "payment_expired"
              ? "Checkout window passed — this lot may run again."
              : state?.yourMaxBid
                ? `Sold for ${formatCurrency(soldAmount)}. You didn't win this one.`
                : `Sold for ${formatCurrency(soldAmount)}.`}
        </span>
      </div>
    );
  }

  if (run && run.product_id !== product.id) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          document.getElementById("auction-live-panel")?.scrollIntoView({ behavior: "smooth" })
        }
      >
        Another auction is live
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1 text-right">
      <Button size="sm" variant="outline" disabled>
        <Gavel className="size-4" />
        {product.auction_allow_prebids ? "Pre-bids soon" : "Bidding opens live"}
      </Button>
      <span className="text-[11px] text-muted-foreground">
        {product.auction_allow_prebids
          ? "Pre-bids open as soon as this lot is listed."
          : "Place bids when the seller starts this auction."}
      </span>
    </div>
  );
}
