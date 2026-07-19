import { describe, expect, it } from "vitest";
import { pickBestAuctionRunForProduct } from "@/lib/auctions";
import type { AuctionRunWithProduct } from "@/lib/auctions";
import type { Product } from "@/lib/database.types";

function makeRun(
  overrides: Partial<AuctionRunWithProduct> & Pick<AuctionRunWithProduct, "id" | "status">,
): AuctionRunWithProduct {
  const product = {
    id: "product-1",
    title: "Test lot",
  } as Product;

  return {
    shop_id: "shop-1",
    product_id: "product-1",
    seller_id: "seller-1",
    starting_bid: 1000,
    min_increment: 100,
    current_bid: 1000,
    current_winner_id: null,
    winning_bid_id: null,
    bid_count: 0,
    starts_at: null,
    ends_at: null,
    soft_close_seconds: 10,
    sudden_death: false,
    checkout_expires_at: null,
    stripe_session_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    product,
    ...overrides,
  };
}

describe("pickBestAuctionRunForProduct", () => {
  it("prefers live over queued", () => {
    const live = makeRun({ id: "live", status: "live", bid_count: 2, current_bid: 4000 });
    const queued = makeRun({
      id: "queued",
      status: "queued",
      created_at: "2026-01-02T00:00:00.000Z",
    });
    expect(pickBestAuctionRunForProduct([queued, live])?.id).toBe("live");
  });

  it("prefers higher bid_count when both queued", () => {
    const withBids = makeRun({
      id: "with-bids",
      status: "queued",
      bid_count: 3,
      current_bid: 3500,
      created_at: "2026-01-02T00:00:00.000Z",
    });
    const empty = makeRun({
      id: "empty",
      status: "queued",
      bid_count: 0,
      current_bid: 1000,
      created_at: "2026-01-01T00:00:00.000Z",
    });
    expect(pickBestAuctionRunForProduct([empty, withBids])?.id).toBe("with-bids");
  });

  it("prefers higher current_bid as tie-break", () => {
    const higherBid = makeRun({
      id: "higher",
      status: "queued",
      bid_count: 2,
      current_bid: 4000,
      created_at: "2026-01-02T00:00:00.000Z",
    });
    const lowerBid = makeRun({
      id: "lower",
      status: "queued",
      bid_count: 2,
      current_bid: 3200,
      created_at: "2026-01-01T00:00:00.000Z",
    });
    expect(pickBestAuctionRunForProduct([lowerBid, higherBid])?.id).toBe("higher");
  });
});
