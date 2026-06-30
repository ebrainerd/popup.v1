import type { ShopWithDetails } from "@/lib/shops";
import { canSellerGoLive } from "@/lib/live-stream";
import { arePayoutsConnected } from "@/lib/payments";

export type DropReadinessItem = {
  id: string;
  label: string;
  done: boolean;
  optional?: boolean;
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
    { id: "details", label: "Shop details complete", done: hasDetails },
    { id: "products", label: "At least one product added", done: hasProducts },
    { id: "cover", label: "Cover image added", done: hasCover },
    { id: "live", label: "Stream source configured", done: hasStreamConfigured, optional: true },
    { id: "schedule", label: "Drop schedule set", done: scheduleSet },
    { id: "terms", label: "Seller terms accepted", done: termsAccepted },
    { id: "payouts", label: "Payments set up", done: payoutsConnected },
    { id: "published", label: "Drop published", done: isPublished },
    { id: "share", label: "Share your shop link copied", done: false, optional: true },
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
