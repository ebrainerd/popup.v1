"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { endedShopEditError } from "@/lib/shop-edit-guard";
import type { AuctionRun } from "@/lib/database.types";

export type AuctionActionResult =
  | { ok: true; data?: Record<string, unknown> }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null };
  return { supabase, user };
}

async function requireOwnedEditableShop(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shopId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: shop } = await supabase
    .from("shops")
    .select("seller_id, status, start_at, end_at")
    .eq("id", shopId)
    .eq("seller_id", userId)
    .maybeSingle();
  if (!shop) return { ok: false, error: "Shop not found." };
  const endedError = endedShopEditError(shop);
  if (endedError) return { ok: false, error: endedError };
  return { ok: true };
}

export async function queueAuction(productId: string): Promise<AuctionActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Log in to manage auctions." };

  const { data: product } = await supabase
    .from("products")
    .select("shop_id")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return { ok: false, error: "Product not found." };

  const shopCheck = await requireOwnedEditableShop(supabase, product.shop_id, user.id);
  if (!shopCheck.ok) return shopCheck;

  const { data, error } = await supabase.rpc("queue_auction_run", {
    p_product_id: productId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true, data: { auctionId: data as string } };
}

export async function startAuction(auctionId: string, shopId: string): Promise<AuctionActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Log in to manage auctions." };

  const shopCheck = await requireOwnedEditableShop(supabase, shopId, user.id);
  if (!shopCheck.ok) return shopCheck;

  const { data: endsAt, error } = await supabase.rpc("start_auction_run", { p_auction_id: auctionId });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/shops/${shopId}`);
  revalidatePath(`/shop/${shopId}`);
  return { ok: true, data: { ends_at: endsAt as string } };
}

export async function cancelAuction(auctionId: string, shopId: string): Promise<AuctionActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Log in to manage auctions." };

  const shopCheck = await requireOwnedEditableShop(supabase, shopId, user.id);
  if (!shopCheck.ok) return shopCheck;

  const { error } = await supabase.rpc("cancel_auction_run", { p_auction_id: auctionId });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/shops/${shopId}`);
  revalidatePath(`/shop/${shopId}`);
  return { ok: true };
}

export async function placeAuctionBid(
  auctionId: string,
  maxAmountCents: number,
): Promise<AuctionActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Log in to bid." };

  const { data, error } = await supabase.rpc("place_auction_bid", {
    p_auction_id: auctionId,
    p_max_amount: maxAmountCents,
  });
  if (error) return { ok: false, error: error.message };

  // Intentionally no revalidatePath — that soft-refreshes the whole shop page,
  // remounts the live player, and forces buyers to unmute again. Bid UI is
  // already synced via applyBid + ROOM_EVENTS.auctionBid.
  return { ok: true, data: data as Record<string, unknown> };
}

export async function finalizeAuction(
  auctionId: string,
  shopId: string,
): Promise<AuctionActionResult> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("finalize_auction_run", {
    p_auction_id: auctionId,
  });
  if (error) return { ok: false, error: error.message };

  const result = data as Record<string, unknown>;
  if (result?.status === "awaiting_payment") {
    const { notifyAuctionWon } = await import("@/lib/notifications");
    void notifyAuctionWon(auctionId);
  }

  revalidatePath(`/shop/${shopId}`);
  revalidatePath(`/dashboard/shops/${shopId}`);
  return { ok: true, data: result };
}

/**
 * Flip an unpaid auction win to payment_expired once its checkout deadline
 * passes. Deadline enforcement lives in the RPC, so any viewer can trigger it
 * (mirrors finalizeAuction).
 */
export async function expireAuctionPayment(
  auctionId: string,
  shopId: string,
): Promise<AuctionActionResult & { expired?: boolean }> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("expire_due_auction_payment", {
    p_auction_id: auctionId,
  });
  if (error) return { ok: false, error: error.message };

  if (data) {
    revalidatePath(`/shop/${shopId}`);
    revalidatePath(`/dashboard/shops/${shopId}`);
  }
  return { ok: true, expired: Boolean(data) };
}

export type PendingAuctionSummary = {
  live: number;
  awaitingPayment: number;
  queuedWithBids: number;
  queued: number;
};

/** Unfinished auction lots for a shop, used to warn before closing early. */
export async function getPendingAuctionSummary(
  shopId: string,
): Promise<PendingAuctionSummary> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("auction_runs")
    .select("status, bid_count")
    .eq("shop_id", shopId)
    .in("status", ["queued", "live", "awaiting_payment"]);

  const summary: PendingAuctionSummary = { live: 0, awaitingPayment: 0, queuedWithBids: 0, queued: 0 };
  for (const run of data ?? []) {
    if (run.status === "live") summary.live += 1;
    else if (run.status === "awaiting_payment") summary.awaitingPayment += 1;
    else if (run.bid_count > 0) summary.queuedWithBids += 1;
    else summary.queued += 1;
  }
  return summary;
}

export type AuctionBidState = {
  run: AuctionRun;
  nextMinimumBid: number;
  viewerState: "winning" | "outbid" | "none";
  yourMaxBid: number | null;
};

export async function getAuctionStateForViewer(
  auctionId: string,
  shopId: string,
): Promise<AuctionBidState | null> {
  const { supabase, user } = await requireUser();
  const { data: run } = await supabase
    .from("auction_runs")
    .select("*")
    .eq("id", auctionId)
    .eq("shop_id", shopId)
    .maybeSingle();
  if (!run) return null;

  const { data: nextMin } = await supabase.rpc("auction_next_minimum_bid", {
    p_starting_bid: run.starting_bid,
    p_min_increment: run.min_increment,
    p_current_bid: run.current_bid,
    p_bid_count: run.bid_count,
  });

  let yourMaxBid: number | null = null;
  let viewerState: AuctionBidState["viewerState"] = "none";
  if (user) {
    const { data: own } = await supabase
      .from("auction_max_bids")
      .select("max_amount")
      .eq("auction_id", auctionId)
      .eq("bidder_id", user.id)
      .maybeSingle();
    yourMaxBid = own?.max_amount ?? null;
    if (run.current_winner_id === user.id) viewerState = "winning";
    else if (yourMaxBid) viewerState = "outbid";
  }

  return {
    run: run as AuctionRun,
    nextMinimumBid: Number(nextMin ?? run.starting_bid),
    viewerState,
    yourMaxBid,
  };
}
