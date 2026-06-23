import "server-only";
import { createClient } from "@/lib/supabase/server";

export type DropReport = {
  grossSales: number;
  orderCount: number;
  unitsSold: number;
  sellThrough: { title: string; sold: number; total: number }[];
  peakViewers: number;
  chatCount: number;
  reminderSignups: number;
  followersGained: number;
  reminderToPurchase: number | null;
};

/** Post-drop summary for the seller dashboard. */
export async function getDropReport(shopId: string, sellerId: string): Promise<DropReport | null> {
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id, seller_id, start_at, end_at, peak_viewers")
    .eq("id", shopId)
    .eq("seller_id", sellerId)
    .maybeSingle();
  if (!shop) return null;

  const [{ data: orders }, { data: products }, { count: chatCount }, { count: reminderCount }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id, amount_paid, buyer_id, product_id")
        .eq("shop_id", shopId)
        .not("status", "in", '("canceled","refunded")'),
      supabase.from("products").select("id, title, quantity").eq("shop_id", shopId),
      supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId),
      supabase
        .from("drop_reminders")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .is("cancelled_at", null),
    ]);

  const orderList = orders ?? [];
  const grossSales = orderList.reduce((sum, o) => sum + (o.amount_paid ?? 0), 0);
  const unitsSold = orderList.length;

  const soldByProduct = new Map<string, number>();
  for (const o of orderList) {
    soldByProduct.set(o.product_id, (soldByProduct.get(o.product_id) ?? 0) + 1);
  }

  const productList = products ?? [];
  const sellThrough = productList.map((p) => ({
    title: p.title,
    sold: soldByProduct.get(p.id) ?? 0,
    total: p.quantity + (soldByProduct.get(p.id) ?? 0),
  }));

  const { count: followersGained } = await supabase
    .from("shop_follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("seller_id", sellerId)
    .gte("created_at", shop.start_at)
    .lte("created_at", shop.end_at);

  // Buyers who had a reminder and also purchased.
  let reminderToPurchase: number | null = null;
  if ((reminderCount ?? 0) > 0) {
    const { data: reminders } = await supabase
      .from("drop_reminders")
      .select("user_id")
      .eq("shop_id", shopId);
    const reminderUserIds = new Set((reminders ?? []).map((r) => r.user_id));
    const buyersFromReminders = orderList.filter((o) => reminderUserIds.has(o.buyer_id)).length;
    reminderToPurchase =
      reminderCount && reminderCount > 0
        ? Math.round((buyersFromReminders / reminderCount) * 100)
        : null;
  }

  return {
    grossSales,
    orderCount: orderList.length,
    unitsSold,
    sellThrough,
    peakViewers: shop.peak_viewers ?? 0,
    chatCount: chatCount ?? 0,
    reminderSignups: reminderCount ?? 0,
    followersGained: followersGained ?? 0,
    reminderToPurchase,
  };
}
