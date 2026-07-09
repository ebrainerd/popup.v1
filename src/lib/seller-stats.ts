import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type SellerStatsRange = "7d" | "30d" | "month" | "all";

export const SELLER_STATS_RANGES: { value: SellerStatsRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

const EXCLUDED_GROSS_STATUSES = new Set(["canceled", "refunded"]);

type OrderRow = {
  amount_paid: number | null;
  status: string;
  created_at: string;
};

/** Parse `?range=` from the dashboard; defaults to last 30 days. */
export function parseSellerStatsRange(param: string | undefined): SellerStatsRange {
  if (param === "7d" || param === "30d" || param === "month" || param === "all") {
    return param;
  }
  return "30d";
}

export function getSellerStatsRangeLabel(range: SellerStatsRange): string {
  return SELLER_STATS_RANGES.find((r) => r.value === range)?.label ?? "30 days";
}

/** ISO timestamp for range start, or null for all-time. */
export function getRangeStartIso(range: SellerStatsRange, now = new Date()): string | null {
  if (range === "all") return null;

  const start = new Date(now);
  if (range === "7d") {
    start.setDate(start.getDate() - 7);
  } else if (range === "30d") {
    start.setDate(start.getDate() - 30);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return start.toISOString();
}

export function computeGrossSalesStats(
  orders: OrderRow[],
  range: SellerStatsRange,
  now = new Date(),
): { grossSales: number; orderCount: number } {
  const startIso = getRangeStartIso(range, now);
  let grossSales = 0;
  let orderCount = 0;

  for (const order of orders) {
    if (EXCLUDED_GROSS_STATUSES.has(order.status)) continue;
    if (startIso && order.created_at < startIso) continue;
    grossSales += order.amount_paid ?? 0;
    orderCount += 1;
  }

  return { grossSales, orderCount };
}

export function countNeedsShipping(orders: Pick<OrderRow, "status">[]): number {
  return orders.filter((o) => o.status === "paid").length;
}

export type SellerDashboardStats = {
  grossSales: number;
  orderCount: number;
  needsShippingCount: number;
};

export async function getSellerDashboardStats(
  supabase: SupabaseClient<Database>,
  shopIds: string[],
  options: { range: SellerStatsRange },
): Promise<SellerDashboardStats> {
  const empty = shopIds.length === 0;
  const ids = empty ? ["00000000-0000-0000-0000-000000000000"] : shopIds;

  const { data: orders, error } = await supabase
    .from("orders")
    .select("amount_paid, status, created_at")
    .in("shop_id", ids);

  if (error) {
    console.error("getSellerDashboardStats error", error.message);
  }

  const orderList = empty ? [] : (orders ?? []);
  const { grossSales, orderCount } = computeGrossSalesStats(orderList, options.range);

  return {
    grossSales,
    orderCount,
    needsShippingCount: countNeedsShipping(orderList),
  };
}
