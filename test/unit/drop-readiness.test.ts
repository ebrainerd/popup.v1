import { describe, expect, it } from "vitest";
import { computeDropHealth } from "@/lib/drop-readiness";
import type { ShopWithDetails } from "@/lib/shops";

const baseShop: ShopWithDetails = {
  id: "shop-1",
  seller_id: "seller-1",
  name: "Test Drop",
  slug: "test-drop",
  description: "A great drop",
  cover_url: "https://example.com/cover.jpg",
  start_at: new Date(Date.now() + 86_400_000).toISOString(),
  end_at: new Date(Date.now() + 90_000_000).toISOString(),
  visibility: "public",
  shipping_rate: 0,
  is_live: false,
  live_url: null,
  twitch_url: null,
  stream_provider: "native",
  stream_room_id: null,
  native_live_started_at: null,
  native_live_ended_at: null,
  native_live_tos_accepted_at: null,
  status: "draft",
  schedule_set: false,
  peak_viewers: 0,
  featured_at: null,
  wizard_completed_steps: [],
  shop_theme: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  seller: null,
  products: [{
    id: "p1",
    shop_id: "shop-1",
    title: "Item",
    description: null,
    photo_url: null,
    photo_urls: [],
    price: 1000,
    quantity: 5,
    shipping_rate: 0,
    discount_price: null,
    is_flash_only: false,
    flash_expires_at: null,
    sale_type: "buy_now",
    auction_starting_bid: null,
    auction_min_increment: null,
    auction_duration_seconds: null,
    auction_allow_prebids: true,
    auction_sudden_death: false,
    created_at: new Date().toISOString(),
  }],
};

describe("computeDropHealth", () => {
  it("marks required checklist items from shop state", () => {
    const health = computeDropHealth(
      baseShop,
      {
        stripe_onboarded: true,
        follower_count: 10,
        seller_terms_accepted_at: new Date().toISOString(),
      },
      3,
    );
    expect(health.productCount).toBe(1);
    expect(health.reminderCount).toBe(3);
    expect(health.items.find((i) => i.id === "details")?.done).toBe(true);
    expect(health.items.find((i) => i.id === "products")?.done).toBe(true);
    expect(health.items.find((i) => i.id === "cover")?.done).toBe(true);
    expect(health.items.find((i) => i.id === "schedule")?.done).toBe(false);
    expect(health.items.find((i) => i.id === "terms")?.done).toBe(true);
    expect(health.items.find((i) => i.id === "published")?.done).toBe(false);
    expect(health.readyCount).toBe(5);
    expect(health.totalRequired).toBe(7);
  });

  it("counts published shop as ready for publish step", () => {
    const health = computeDropHealth(
      { ...baseShop, status: "scheduled", schedule_set: true },
      {
        stripe_onboarded: true,
        follower_count: 0,
        seller_terms_accepted_at: new Date().toISOString(),
      },
      0,
    );
    expect(health.items.find((i) => i.id === "published")?.done).toBe(true);
    expect(health.readyCount).toBe(7);
  });

  it("marks schedule complete when set", () => {
    const health = computeDropHealth(
      { ...baseShop, schedule_set: true },
      { stripe_onboarded: true, follower_count: 0 },
      0,
    );
    expect(health.items.find((i) => i.id === "schedule")?.done).toBe(true);
  });

  it("marks terms incomplete when not accepted", () => {
    const health = computeDropHealth(baseShop, { stripe_onboarded: true, follower_count: 0 }, 0);
    expect(health.items.find((i) => i.id === "terms")?.done).toBe(false);
  });

  it("marks payouts incomplete when Stripe is required", () => {
    const prev = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_test_example";

    const health = computeDropHealth(baseShop, { stripe_onboarded: false, follower_count: 0 }, 0);
    expect(health.items.find((i) => i.id === "payouts")?.done).toBe(false);

    process.env.STRIPE_SECRET_KEY = prev;
  });
});
