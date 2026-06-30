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

function pickPrimaryAuctionRun(
  runs: AuctionRunWithProduct[],
): AuctionRunWithProduct | null {
  if (runs.length === 0) return null;
  const priority: Record<string, number> = {
    live: 0,
    awaiting_payment: 1,
    queued: 2,
  };
  return [...runs].sort((a, b) => {
    const pa = priority[a.status] ?? 3;
    const pb = priority[b.status] ?? 3;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })[0];
}

/** Queue all pre-bid-eligible auction lots when the shop is open (idempotent). */
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

  const result: Record<string, AuctionProductState> = {};
  for (const run of runs as unknown as AuctionRunWithProduct[]) {
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

    result[run.product_id] = {
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
