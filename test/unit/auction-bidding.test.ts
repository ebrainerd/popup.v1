import { describe, expect, it } from "vitest";
import {
  computeVisibleBid,
  nextMinimumBid,
  resolveAuctionLeader,
  shouldExtendAuction,
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
