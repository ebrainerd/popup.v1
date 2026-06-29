import { describe, expect, it } from "vitest";
import {
  effectiveAuctionStartingBid,
  isFlashDiscounted,
  productDisplayPrice,
} from "@/lib/product-pricing";

describe("product pricing", () => {
  const auction = {
    price: 1_000_000,
    sale_type: "auction" as const,
    auction_starting_bid: 1_000_000,
    discount_price: 999,
  };

  it("detects flash deals against the original list price", () => {
    expect(isFlashDiscounted(auction)).toBe(true);
    expect(effectiveAuctionStartingBid(auction)).toBe(999);
    expect(productDisplayPrice(auction)).toBe(999);
  });

  it("keeps the normal starting bid when no flash deal is active", () => {
    const normal = { ...auction, discount_price: null };
    expect(isFlashDiscounted(normal)).toBe(false);
    expect(effectiveAuctionStartingBid(normal)).toBe(1_000_000);
  });
});
