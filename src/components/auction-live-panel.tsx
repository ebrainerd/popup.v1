"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gavel, Timer, Trophy } from "lucide-react";
import { useShopRoom, useShopEvent } from "@/components/shop-room";
import {
  placeAuctionBid,
  finalizeAuction,
} from "@/app/shop/auction-actions";
import { createAuctionCheckoutSession } from "@/app/shop/checkout-actions";
import {
  ROOM_EVENTS,
  type AuctionStartedBroadcast,
  type AuctionBidBroadcast,
  type AuctionEndedBroadcast,
} from "@/lib/realtime";
import type { AuctionRunWithProduct } from "@/lib/auctions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";

type LiveAuctionState = {
  run: AuctionRunWithProduct;
  nextMinimumBid: number;
  viewerState: "winning" | "outbid" | "none";
  yourMaxBid: number | null;
  winnerName: string | null;
};

export function AuctionLivePanel({
  shopId,
  initial,
  isAuthed,
  isOwner,
  userId,
}: {
  shopId: string;
  initial: LiveAuctionState | null;
  isAuthed: boolean;
  isOwner: boolean;
  userId: string | null;
}) {
  const router = useRouter();
  const { emit, currentUser } = useShopRoom();
  const [state, setState] = useState<LiveAuctionState | null>(initial);
  const [maxBid, setMaxBid] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [extendedPulse, setExtendedPulse] = useState(false);
  const [ended, setEnded] = useState<AuctionEndedBroadcast | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (state?.run.status !== "live" || !state.run.ends_at) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state?.run.status, state?.run.ends_at]);

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
        winnerName: payload.currentWinnerName,
      };
    });
    if (payload.extended) {
      setExtendedPulse(true);
      setTimeout(() => setExtendedPulse(false), 3000);
    }
  }, []);

  useShopEvent(ROOM_EVENTS.auctionStarted, (payload) => {
    const p = payload as AuctionStartedBroadcast;
    setEnded(null);
    setState((prev) => {
      if (!prev || prev.run.product_id !== p.productId) return prev;
      return {
        ...prev,
        run: {
          ...prev.run,
          id: p.auctionId,
          status: "live",
          ends_at: p.endsAt,
          current_bid: p.startingBid,
          bid_count: 0,
          current_winner_id: null,
        },
        nextMinimumBid: p.startingBid,
        viewerState: "none",
        yourMaxBid: null,
        winnerName: null,
      };
    });
  });

  useShopEvent(ROOM_EVENTS.auctionBid, (payload) => {
    const p = payload as AuctionBidBroadcast;
    applyBid(p);
    if (userId) {
      if (p.currentWinnerId === userId) {
        setState((s) => (s ? { ...s, viewerState: "winning" } : s));
      } else {
        setState((s) =>
          s && s.yourMaxBid ? { ...s, viewerState: "outbid" } : s,
        );
      }
    }
  });

  useShopEvent(ROOM_EVENTS.auctionExtended, (payload) => {
    applyBid(payload as AuctionBidBroadcast);
  });

  useShopEvent(ROOM_EVENTS.auctionEnded, (payload) => {
    const p = payload as AuctionEndedBroadcast;
    setEnded(p);
    setState((prev) => {
      if (!prev || prev.run.id !== p.auctionId) return prev;
      return {
        ...prev,
        run: { ...prev.run, status: p.status as typeof prev.run.status },
      };
    });
  });

  // Auto-finalize when timer elapses (any viewer can trigger).
  useEffect(() => {
    const run = state?.run;
    if (!run || run.status !== "live" || !run.ends_at) return;

    const endsMs = new Date(run.ends_at).getTime();
    const delay = endsMs - Date.now();
    if (delay <= 0) {
      void finalizeNow(run.id, run.product_id);
      return;
    }

    const timer = setTimeout(() => {
      void finalizeNow(run.id, run.product_id);
    }, delay + 300);

    return () => clearTimeout(timer);

    async function finalizeNow(auctionId: string, productId: string) {
      const res = await finalizeAuction(auctionId, shopId);
      if (!res.ok || !res.data) return;
      const data = res.data as Record<string, unknown>;
      const payload: AuctionEndedBroadcast = {
        auctionId,
        productId,
        status: (data.status as AuctionEndedBroadcast["status"]) ?? "unsold",
        winningBid: data.winning_bid as number | undefined,
        winnerId: data.winner_id as string | undefined,
        checkoutExpiresAt: data.checkout_expires_at as string | undefined,
      };
      setEnded(payload);
      emit(ROOM_EVENTS.auctionEnded, payload);
      if (payload.status === "awaiting_payment") {
        emit(ROOM_EVENTS.auctionWon, payload);
      }
    }
  }, [state?.run?.id, state?.run?.status, state?.run?.ends_at, shopId, emit]);

  if (!state) return null;

  const { run } = state;
  const isLive = run.status === "live";
  const isQueued = run.status === "queued";
  const isAwaiting = run.status === "awaiting_payment" || ended?.status === "awaiting_payment";
  const viewerWon = isAwaiting && userId === (ended?.winnerId ?? run.current_winner_id);
  const allowBids = (isLive || (isQueued && run.product.auction_allow_prebids)) && !isOwner;

  function placeBid(amountCents: number) {
    setError(null);
    startTransition(async () => {
      const res = await placeAuctionBid(run.id, amountCents, shopId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const data = res.data as Record<string, unknown>;
      const winnerName =
        currentUser && data.current_winner_id === currentUser.id
          ? currentUser.username
          : state?.winnerName ?? null;
      const payload: AuctionBidBroadcast = {
        auctionId: run.id,
        productId: run.product_id,
        status: run.status,
        currentBid: data.current_bid as number,
        bidCount: data.bid_count as number,
        currentWinnerId: data.current_winner_id as string | null,
        currentWinnerName: winnerName,
        endsAt: data.ends_at as string | null,
        nextMinimumBid: data.next_minimum_bid as number,
        extended: Boolean(data.extended),
      };
      applyBid(payload);
      setState((s) =>
        s
          ? {
              ...s,
              viewerState: (data.viewer_state as LiveAuctionState["viewerState"]) ?? "none",
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

  function quickBid() {
    if (!state) return;
    if (!isAuthed) {
      router.push(`/login?redirectTo=${encodeURIComponent(`/shop/${shopId}`)}`);
      return;
    }
    placeBid(state.nextMinimumBid);
  }

  function setMaxBidSubmit() {
    if (!isAuthed) {
      router.push(`/login?redirectTo=${encodeURIComponent(`/shop/${shopId}`)}`);
      return;
    }
    const dollars = parseFloat(maxBid);
    if (Number.isNaN(dollars)) {
      setError("Enter a valid max bid.");
      return;
    }
    placeBid(Math.round(dollars * 100));
  }

  function checkout() {
    startTransition(async () => {
      const res = await createAuctionCheckoutSession(run.id);
      if (res.ok) window.location.href = res.url;
      else setError(res.error);
    });
  }

  const remaining = run.ends_at ? Math.max(0, new Date(run.ends_at).getTime() - nowMs) : 0;
  const secondsLeft = Math.ceil(remaining / 1000);

  return (
    <div
      className={cn(
        "mb-8 overflow-hidden rounded-2xl border-2 border-primary/50 bg-gradient-to-br from-primary/10 to-accent/5 p-5 shadow-lg",
        isLive && secondsLeft <= 10 && "animate-live-pulse",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gavel className="size-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold">{run.product.title}</h2>
            <p className="text-sm text-muted-foreground">
              {isQueued
                ? run.product.auction_allow_prebids
                  ? "Pre-bidding open"
                  : "Bidding opens live"
                : isLive
                  ? "Live auction"
                  : isAwaiting
                    ? "Auction ended"
                    : ended?.status === "unsold"
                      ? "Unsold"
                      : "Auction"}
            </p>
          </div>
        </div>
        {isLive && (
          <Badge variant="live" className="gap-1">
            <Timer className="size-3.5" />
            {secondsLeft}s
          </Badge>
        )}
        {isQueued && <Badge variant="accent">Auction</Badge>}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Current bid" value={formatCurrency(run.current_bid)} />
        <Stat label="Next min bid" value={formatCurrency(state.nextMinimumBid)} />
        <Stat label="Bids" value={String(run.bid_count)} />
      </div>

      {state.winnerName && isLive && (
        <p className="mt-2 text-sm text-muted-foreground">
          Leading: <span className="font-medium text-foreground">{state.winnerName}</span>
        </p>
      )}

      {extendedPulse && (
        <p className="mt-2 text-sm font-medium text-accent">Bid landed — timer extended.</p>
      )}

      {state.viewerState === "winning" && isLive && (
        <p className="mt-2 flex items-center gap-1 text-sm font-medium text-primary">
          <Trophy className="size-4" /> You are winning at {formatCurrency(run.current_bid)}.
        </p>
      )}
      {state.viewerState === "outbid" && isLive && (
        <p className="mt-2 text-sm text-live">
          You were outbid. Your max bid was reached.
        </p>
      )}

      {viewerWon && (
        <div className="mt-4 rounded-lg border border-primary bg-primary/10 p-4">
          <p className="font-semibold">You won — checkout now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pay {formatCurrency(ended?.winningBid ?? run.current_bid)} plus shipping. If you win,
            you agree to pay this price plus shipping.
          </p>
          <Button className="mt-3" onClick={checkout} disabled={pending}>
            {pending ? "Starting…" : "Checkout now"}
          </Button>
        </div>
      )}

      {allowBids && (isLive || isQueued) && (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Button onClick={quickBid} disabled={pending}>
            Bid {formatCurrency(state.nextMinimumBid)}
          </Button>
          <div className="flex min-w-48 flex-1 items-end gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="max-bid">
                Set max bid (USD)
              </label>
              <Input
                id="max-bid"
                type="number"
                min={state.nextMinimumBid / 100}
                step="0.01"
                placeholder={(state.nextMinimumBid / 100).toFixed(2)}
                value={maxBid}
                onChange={(e) => setMaxBid(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={setMaxBidSubmit} disabled={pending}>
              Max bid
            </Button>
          </div>
        </div>
      )}

      {run.sudden_death && isLive && (
        <p className="mt-2 text-xs text-muted-foreground">
          Sudden death: last valid bid before zero wins.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-live">{error}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/60 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
