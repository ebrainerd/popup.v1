import { isPublishedShopEnded } from "@/lib/utils";

export const SHOP_ENDED_EDIT_MESSAGE =
  "This shop has ended. Duplicate it to run another drop.";

/** Returns the edit-block message when a published shop's drop window has ended. */
export function endedShopEditError(
  shop: { status: string; start_at: string; end_at: string },
  now?: Date,
): string | null {
  return isPublishedShopEnded(shop, now) ? SHOP_ENDED_EDIT_MESSAGE : null;
}
