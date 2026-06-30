/** Fixed placeholder window for draft shops before the seller picks real times. */
export const PLACEHOLDER_SCHEDULE = {
  start_at: "2099-06-01T18:00:00.000Z",
  end_at: "2099-06-01T20:00:00.000Z",
} as const;

export function isShopScheduleSet(shop: { schedule_set?: boolean }): boolean {
  return shop.schedule_set === true;
}
