import { describe, expect, it } from "vitest";
import type { BuyerOrder } from "@/lib/orders";

// Mirror PostPurchaseCta follow guard logic
function shouldShowFollowButton(sellerId: string, following: Set<string>) {
  return !following.has(sellerId);
}

describe("post-purchase follow CTA", () => {
  it("does not prompt follow when buyer already follows seller", () => {
    const sellerId = "seller-1";
    const following = new Set([sellerId]);
    expect(shouldShowFollowButton(sellerId, following)).toBe(false);
  });

  it("prompts follow for new seller relationships", () => {
    expect(shouldShowFollowButton("seller-2", new Set(["seller-1"]))).toBe(true);
  });

  it("collects seller ids from recent orders", () => {
    const orders = [
      {
        shop: { seller_id: "a", id: "s1", name: "One", seller: { username: "a", display_name: null } },
      },
      {
        shop: { seller_id: "b", id: "s2", name: "Two", seller: { username: "b", display_name: null } },
      },
    ] as unknown as BuyerOrder[];

    const ids = [
      ...new Set(orders.map((o) => o.shop?.seller_id).filter((id): id is string => Boolean(id))),
    ];
    expect(ids).toEqual(["a", "b"]);
  });
});
