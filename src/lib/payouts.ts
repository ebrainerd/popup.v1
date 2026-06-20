import "server-only";
import { getStripe, releaseDelayHours } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type ReleaseResult = { released: boolean; reason?: string };

/**
 * Release held funds for an order to the seller's connected account
 * (amount paid minus the platform fee), using separate charges & transfers.
 * Funds are held for `RELEASE_DELAY_HOURS` after the order is shipped unless
 * `force` is set. Safe to call repeatedly — it's a no-op once released.
 */
export async function releaseOrderFunds(
  orderId: string,
  opts: { force?: boolean } = {},
): Promise<ReleaseResult> {
  const stripe = getStripe();
  if (!stripe) return { released: false, reason: "stripe_not_configured" };

  const supabase = createServiceRoleClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, amount_paid, platform_fee, payment_intent, transfer_id, released_at, shipped_at, shop_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { released: false, reason: "not_found" };
  if (order.released_at || order.transfer_id) return { released: false, reason: "already_released" };
  if (!order.payment_intent) return { released: false, reason: "no_payment" };

  if (!opts.force) {
    if (!order.shipped_at) return { released: false, reason: "not_shipped" };
    const elapsedHours = (Date.now() - new Date(order.shipped_at).getTime()) / 3_600_000;
    if (elapsedHours < releaseDelayHours()) return { released: false, reason: "holding" };
  }

  const { data: shop } = await supabase
    .from("shops")
    .select("seller_id")
    .eq("id", order.shop_id)
    .single();
  if (!shop) return { released: false, reason: "shop_missing" };

  const { data: seller } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", shop.seller_id)
    .single();
  if (!seller?.stripe_account_id) return { released: false, reason: "seller_not_connected" };

  const amount = Math.max(0, order.amount_paid - order.platform_fee);
  if (amount === 0) {
    await supabase
      .from("orders")
      .update({ released_at: new Date().toISOString() })
      .eq("id", order.id);
    return { released: true };
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(order.payment_intent);
    const charge =
      typeof pi.latest_charge === "string" ? pi.latest_charge : (pi.latest_charge?.id ?? undefined);

    const transfer = await stripe.transfers.create({
      amount,
      currency: "usd",
      destination: seller.stripe_account_id,
      source_transaction: charge,
      transfer_group: order.id,
      metadata: { order_id: order.id },
    });

    await supabase
      .from("orders")
      .update({ transfer_id: transfer.id, released_at: new Date().toISOString() })
      .eq("id", order.id);
    return { released: true };
  } catch (err) {
    console.error("releaseOrderFunds failed", err);
    return { released: false, reason: "transfer_error" };
  }
}

/** Release all orders whose hold window has elapsed. Returns count released. */
export async function releaseEligibleOrders(): Promise<number> {
  const supabase = createServiceRoleClient();
  const cutoff = new Date(Date.now() - releaseDelayHours() * 3_600_000).toISOString();

  const { data } = await supabase
    .from("orders")
    .select("id")
    .is("released_at", null)
    .not("shipped_at", "is", null)
    .lt("shipped_at", cutoff)
    .in("status", ["shipped", "in_transit", "delivered", "received"]);

  let count = 0;
  for (const o of data ?? []) {
    const res = await releaseOrderFunds(o.id);
    if (res.released) count++;
  }
  return count;
}
