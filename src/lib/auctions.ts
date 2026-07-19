import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AuctionRun, Product } from "@/lib/database.types";

export type AuctionRunWithProduct = AuctionRun & { product: Product };

export type AuctionProductState = {
  run: AuctionRunWithProduct;
  nextMinimumBid: number;
  viewerState: "winning" | "outbid" | "none";
  yourMaxBid: number | null;
};

const ACTIVE_AUCTION_STATUSES = ["queued", "live", "awaiting_payment"] as const;

const AUCTION_RUN_STATUS_PRIORITY: Record<string, number> = {
  live: 0,
  awaiting_payment: 1,
  queued: 2,
};

/** Pick the canonical active run when duplicates exist for one product. */
export function pickBestAuctionRunForProduct(
  runs: AuctionRunWithProduct[],
): AuctionRunWithProduct | null {
  if (runs.length === 0) return null;
  return [...runs].sort((a, b) => {
    const pa = AUCTION_RUN_STATUS_PRIORITY[a.status] ?? 3;
    const pb = AUCTION_RUN_STATUS_PRIORITY[b.status] ?? 3;
    if (pa !== pb) return pa - pb;
    if (a.bid_count !== b.bid_count) return b.bid_count - a.bid_count;
    if (a.current_bid !== b.current_bid) return b.current_bid - a.current_bid;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  })[0];
}

function pickPrimaryAuctionRun(
  runs: AuctionRunWithProduct[],
): AuctionRunWithProduct | null {
  const byProduct = new Map<string, AuctionRunWithProduct[]>();
  for (const run of runs) {
    const list = byProduct.get(run.product_id) ?? [];
    list.push(run);
    byProduct.set(run.product_id, list);
  }
  const bestPerProduct = [...byProduct.values()]
    .map((productRuns) => pickBestAuctionRunForProduct(productRuns))
    .filter((run): run is AuctionRunWithProduct => run !== null);
  return pickBestAuctionRunForProduct(bestPerProduct);
}

/** Queue all pre-bid-eligible auction lots for a published shop (idempotent). */
export async function autoQueueShopAuctions(shopId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("auto_queue_shop_auctions", {
    p_shop_id: shopId,
  });
  if (error) {
    console.error("autoQueueShopAuctions error", error.message);
    return 0;
  }
  return Number(data ?? 0);
}

/**
 * Opportunistically expire unpaid auction wins whose 30-minute checkout
 * window has lapsed (webhooks only cover winners who opened Stripe checkout).
 * Runs on shop page load; the RPC is deadline-guarded so this is safe for
 * any viewer session.
 */
export async function expireDueAuctionPayments(shopId: string): Promise<void> {
  const supabase = await createClient();
  const { data: dueRuns } = await supabase
    .from("auction_runs")
    .select("id")
    .eq("shop_id", shopId)
    .eq("status", "awaiting_payment")
    .lte("checkout_expires_at", new Date().toISOString());
  if (!dueRuns?.length) return;

  for (const run of dueRuns) {
    const { error } = await supabase.rpc("expire_due_auction_payment", {
      p_auction_id: run.id,
    });
    if (error) console.error("expireDueAuctionPayments error", error.message);
  }
}

/**
 * Finalize live auction runs whose timer has elapsed or whose shop has closed.
 * Safe to call on every shop page load; no-ops when nothing is due.
 */
export async function finalizeDueShopAuctions(shopId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finalize_due_shop_auctions", {
    p_shop_id: shopId,
  });
  if (error) {
    console.error("finalizeDueShopAuctions error", error.message);
    return 0;
  }
  const count = Number(data ?? 0);
  // Best-effort win emails for runs that just flipped to awaiting_payment
  // (timer/shop-end finalize) or were repaired from a mis-marked unsold.
  // notifyAuctionWon uses Resend idempotency keys so repeat page loads are safe.
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: wins } = await supabase
    .from("auction_runs")
    .select("id")
    .eq("shop_id", shopId)
    .eq("status", "awaiting_payment")
    .gte("updated_at", since);
  if (wins?.length) {
    const { notifyAuctionWon } = await import("@/lib/notifications");
    for (const win of wins) {
      void notifyAuctionWon(win.id);
    }
  }
  return count;
}

export async function getShopAuctionRuns(shopId: string): Promise<AuctionRunWithProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("auction_runs")
    .select("*, product:products(*)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getShopAuctionRuns error", error.message);
    return [];
  }
  return (data ?? []) as unknown as AuctionRunWithProduct[];
}

export async function getActiveAuctionRun(shopId: string): Promise<AuctionRunWithProduct | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("auction_runs")
    .select("*, product:products(*)")
    .eq("shop_id", shopId)
    .in("status", [...ACTIVE_AUCTION_STATUSES])
    .order("created_at", { ascending: false });
  return pickPrimaryAuctionRun((data ?? []) as unknown as AuctionRunWithProduct[]);
}

export async function getAuctionProductStates(
  shopId: string,
  userId: string | null,
): Promise<Record<string, AuctionProductState>> {
  const supabase = await createClient();
  const { data: runs, error } = await supabase
    .from("auction_runs")
    .select("*, product:products(*)")
    .eq("shop_id", shopId)
    .in("status", [...ACTIVE_AUCTION_STATUSES]);
  if (error) {
    console.error("getAuctionProductStates error", error.message);
    return {};
  }
  if (!runs?.length) return {};

  const typedRuns = runs as unknown as AuctionRunWithProduct[];
  const byProduct = new Map<string, AuctionRunWithProduct[]>();
  for (const run of typedRuns) {
    const list = byProduct.get(run.product_id) ?? [];
    list.push(run);
    byProduct.set(run.product_id, list);
  }

  const result: Record<string, AuctionProductState> = {};
  for (const [productId, productRuns] of byProduct) {
    const run = pickBestAuctionRunForProduct(productRuns);
    if (!run) continue;

    const { data: nextMin } = await supabase.rpc("auction_next_minimum_bid", {
      p_starting_bid: run.starting_bid,
      p_min_increment: run.min_increment,
      p_current_bid: run.current_bid,
      p_bid_count: run.bid_count,
    });

    let yourMaxBid: number | null = null;
    let viewerState: AuctionProductState["viewerState"] = "none";
    if (userId) {
      yourMaxBid = await getViewerMaxBid(run.id, userId);
      if (run.current_winner_id === userId) viewerState = "winning";
      else if (yourMaxBid) viewerState = "outbid";
    }

    result[productId] = {
      run,
      nextMinimumBid: Number(nextMin ?? run.starting_bid),
      viewerState,
      yourMaxBid,
    };
  }
  return result;
}

export async function getAuctionBidEvents(auctionId: string, limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("auction_bid_events")
    .select("id, visible_amount, event_type, created_at, bidder:profiles!auction_bid_events_bidder_id_fkey(username, display_name)")
    .eq("auction_id", auctionId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getViewerMaxBid(auctionId: string, userId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("auction_max_bids")
    .select("max_amount")
    .eq("auction_id", auctionId)
    .eq("bidder_id", userId)
    .maybeSingle();
  return data?.max_amount ?? null;
}

export async function getLiveAuctionPanelState(
  shopId: string,
  userId: string | null,
): Promise<{
  run: AuctionRunWithProduct;
  nextMinimumBid: number;
  viewerState: "winning" | "outbid" | "none";
  yourMaxBid: number | null;
  winnerName: string | null;
} | null> {
  const active = await getActiveAuctionRun(shopId);
  if (!active) return null;

  const supabase = await createClient();
  const { data: nextMin } = await supabase.rpc("auction_next_minimum_bid", {
    p_starting_bid: active.starting_bid,
    p_min_increment: active.min_increment,
    p_current_bid: active.current_bid,
    p_bid_count: active.bid_count,
  });

  let yourMaxBid: number | null = null;
  let viewerState: "winning" | "outbid" | "none" = "none";
  if (userId) {
    yourMaxBid = await getViewerMaxBid(active.id, userId);
    if (active.current_winner_id === userId) viewerState = "winning";
    else if (yourMaxBid) viewerState = "outbid";
  }

  let winnerName: string | null = null;
  if (active.current_winner_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", active.current_winner_id)
      .maybeSingle();
    winnerName = profile?.username ?? null;
  }

  return {
    run: active,
    nextMinimumBid: Number(nextMin ?? active.starting_bid),
    viewerState,
    yourMaxBid,
    winnerName,
  };
}
