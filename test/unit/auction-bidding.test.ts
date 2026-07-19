import { describe, expect, it } from "vitest";
import {
  AUCTION_DURATION_PRESETS,
  AUCTION_UNTIL_SHOP_CLOSES_VALUE,
  auctionDurationToSelectValue,
  computeVisibleBid,
  isAuctionUntilShopCloses,
  nextMinimumBid,
  parseAuctionDurationSelectValue,
  resolveAuctionLeader,
  resolveAuctionDurationForDb,
  shouldExtendAuction,
  validateAuctionDurationConfig,
} from "@/lib/auction-bidding";

describe("computeVisibleBid", () => {
  it("returns starting bid when only one bidder", () => {
    expect(computeVisibleBid(2000, 200, 5000, null)).toBe(2000);
  });

  it("raises visible bid when runner-up exists", () => {
    expect(computeVisibleBid(2000, 200, 5000, 3000)).toBe(3200);
    expect(computeVisibleBid(2000, 200, 6000, 5000)).toBe(5200);
  });
});

describe("nextMinimumBid", () => {
  it("uses starting bid for first bid", () => {
    expect(nextMinimumBid(2000, 200, 2000, 0)).toBe(2000);
  });

  it("adds increment after bids exist", () => {
    expect(nextMinimumBid(2000, 200, 3200, 2)).toBe(3400);
  });
});

describe("resolveAuctionLeader", () => {
  const starting = 2000;
  const increment = 200;

  it("matches PRD proxy example", () => {
    let bids = [{ bidderId: "alice", maxAmount: 5000, createdAt: 1 }];
    let r = resolveAuctionLeader(starting, increment, bids);
    expect(r.visibleBid).toBe(2000);
    expect(r.winnerId).toBe("alice");

    bids = [
      { bidderId: "alice", maxAmount: 5000, createdAt: 1 },
      { bidderId: "bob", maxAmount: 3000, createdAt: 2 },
    ];
    r = resolveAuctionLeader(starting, increment, bids);
    expect(r.visibleBid).toBe(3200);
    expect(r.winnerId).toBe("alice");

    bids = [
      { bidderId: "alice", maxAmount: 5000, createdAt: 1 },
      { bidderId: "bob", maxAmount: 6000, createdAt: 3 },
    ];
    r = resolveAuctionLeader(starting, increment, bids);
    expect(r.visibleBid).toBe(5200);
    expect(r.winnerId).toBe("bob");
  });

  it("breaks equal max bids by earlier createdAt", () => {
    const bids = [
      { bidderId: "alice", maxAmount: 5000, createdAt: 1 },
      { bidderId: "bob", maxAmount: 5000, createdAt: 2 },
    ];
    const r = resolveAuctionLeader(starting, increment, bids);
    expect(r.winnerId).toBe("alice");
    expect(r.visibleBid).toBe(2000);
  });
});

describe("shouldExtendAuction", () => {
  const softClose = 10;

  it("extends when bid lands under soft-close window", () => {
    const endsAt = Date.now() + 5000;
    expect(shouldExtendAuction(endsAt, Date.now(), softClose, false)).toBe(true);
  });

  it("does not extend for sudden death", () => {
    const endsAt = Date.now() + 5000;
    expect(shouldExtendAuction(endsAt, Date.now(), softClose, true)).toBe(false);
  });
});

describe("auction duration presets", () => {
  it("includes grouped live, longer, and shop presets with 60s default", () => {
    expect(AUCTION_DURATION_PRESETS.find((p) => p.seconds === 60)?.label).toBe("1 min");
    expect(AUCTION_DURATION_PRESETS.some((p) => p.group === "live")).toBe(true);
    expect(AUCTION_DURATION_PRESETS.some((p) => p.group === "longer")).toBe(true);
    expect(AUCTION_DURATION_PRESETS.some((p) => p.group === "shop" && p.seconds === null)).toBe(
      true,
    );
  });

  it("round-trips select values", () => {
    expect(auctionDurationToSelectValue(false, 300)).toBe("300");
    expect(auctionDurationToSelectValue(true, 300)).toBe(AUCTION_UNTIL_SHOP_CLOSES_VALUE);
    expect(parseAuctionDurationSelectValue("120")).toEqual({
      endsWithShop: false,
      durationSeconds: 120,
    });
    expect(parseAuctionDurationSelectValue(AUCTION_UNTIL_SHOP_CLOSES_VALUE)).toEqual({
      endsWithShop: true,
      durationSeconds: 60,
    });
  });

  it("validates fixed duration vs until shop closes", () => {
    expect(validateAuctionDurationConfig(true, null)).toEqual({ ok: true });
    expect(validateAuctionDurationConfig(false, 60)).toEqual({ ok: true });
    expect(validateAuctionDurationConfig(false, 0).ok).toBe(false);
    expect(isAuctionUntilShopCloses(null, true)).toBe(true);
    expect(isAuctionUntilShopCloses(60, false)).toBe(false);
  });

  it("resolves database fields for auction products", () => {
    expect(resolveAuctionDurationForDb(true, true, null)).toEqual({
      auction_duration_seconds: null,
      auction_ends_with_shop: true,
    });
    expect(resolveAuctionDurationForDb(true, false, 120)).toEqual({
      auction_duration_seconds: 120,
      auction_ends_with_shop: false,
    });
    expect(resolveAuctionDurationForDb(false, false, 120)).toEqual({
      auction_duration_seconds: null,
      auction_ends_with_shop: false,
    });
  });
});
