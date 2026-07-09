import type { ShopWithDetails } from "@/lib/shops";
import { canSellerGoLive } from "@/lib/live-stream";
import { arePayoutsConnected } from "@/lib/payments";

export type DropReadinessGroup = "setup" | "promotion";

export type DropReadinessItem = {
  id: string;
  label: string;
  done: boolean;
  optional?: boolean;
  group: DropReadinessGroup;
};

export type DropHealth = {
  items: DropReadinessItem[];
  readyCount: number;
  totalRequired: number;
  productCount: number;
  availableUnits: number;
  followerCount: number;
  reminderCount: number;
  isPublished: boolean;
  openingAt: string;
};

type SellerContext = {
  stripe_onboarded: boolean;
  follower_count: number;
  seller_terms_accepted_at?: string | null;
};

/** Compute launch checklist and drop health for the seller dashboard. */
export function computeDropHealth(
  shop: ShopWithDetails,
  seller: SellerContext,
  reminderCount: number,
): DropHealth {
  const productCount = shop.products.length;
  const availableUnits = shop.products.reduce((sum, p) => sum + p.quantity, 0);
  const hasDetails = Boolean(shop.name.trim() && shop.description?.trim());
  const hasCover = Boolean(shop.cover_url);
  const hasStreamConfigured = canSellerGoLive(shop);
  const isPublished = shop.status !== "draft";
  const hasProducts = productCount > 0;
  const payoutsConnected = arePayoutsConnected(seller);
  const termsAccepted = Boolean(seller.seller_terms_accepted_at);
  const scheduleSet = shop.schedule_set === true;

  const items: DropReadinessItem[] = [
    { id: "details", label: "Shop details complete", done: hasDetails, group: "setup" },
    { id: "products", label: "At least one product added", done: hasProducts, group: "setup" },
    { id: "cover", label: "Cover image added", done: hasCover, group: "setup" },
    {
      id: "live",
      label: "Stream source configured",
      done: hasStreamConfigured,
      optional: true,
      group: "setup",
    },
    { id: "schedule", label: "Drop schedule set", done: scheduleSet, group: "setup" },
    { id: "terms", label: "Seller terms accepted", done: termsAccepted, group: "setup" },
    { id: "payouts", label: "Payments set up", done: payoutsConnected, group: "setup" },
    { id: "published", label: "Drop published", done: isPublished, group: "setup" },
    {
      id: "share",
      label: "Shop link copied",
      done: false,
      optional: true,
      group: "promotion",
    },
    {
      id: "post-social",
      label: "Post drop link on IG / TikTok",
      done: false,
      optional: true,
      group: "promotion",
    },
    {
      id: "pin-link",
      label: "Pin link in bio or story highlight",
      done: false,
      optional: true,
      group: "promotion",
    },
    {
      id: "hour-before",
      label: "1h-before reminder post",
      done: false,
      optional: true,
      group: "promotion",
    },
  ];

  const required = items.filter((i) => !i.optional);
  const readyCount = required.filter((i) => i.done).length;

  return {
    items,
    readyCount,
    totalRequired: required.length,
    productCount,
    availableUnits,
    followerCount: seller.follower_count,
    reminderCount,
    isPublished,
    openingAt: shop.start_at,
  };
}
