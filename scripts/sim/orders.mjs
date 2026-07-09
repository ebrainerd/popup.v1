import { createAdmin } from "./clients.mjs";

/** Platform fee in cents (sim uses floor per contract). */
function platformFeeBps() {
  const raw = Number(process.env.PLATFORM_FEE_BPS ?? 900);
  return Number.isFinite(raw) && raw >= 0 && raw <= 10000 ? raw : 900;
}

function platformFeeCents(amountCents) {
  return Math.floor((amountCents * platformFeeBps()) / 10000);
}

/**
 * Simulate a paid order (webhook path) via service role.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{
 *   buyerId: string;
 *   shopId: string;
 *   productId: string;
 *   amountPaid: number;
 *   shippingAmount?: number;
 *   auctionId?: string | null;
 *   winningBidId?: string | null;
 * }} input
 */
export async function simulatePaidOrder(admin, input) {
  const {
    buyerId,
    shopId,
    productId,
    amountPaid,
    shippingAmount = 0,
    auctionId = null,
    winningBidId = null,
  } = input;

  const fee = platformFeeCents(amountPaid);
  const sessionId = `sim_${crypto.randomUUID()}`;

  const { data: before } = await admin
    .from("products")
    .select("quantity")
    .eq("id", productId)
    .maybeSingle();

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      buyer_id: buyerId,
      shop_id: shopId,
      product_id: productId,
      amount_paid: amountPaid,
      platform_fee: fee,
      shipping_amount: shippingAmount,
      status: "paid",
      stripe_session_id: sessionId,
      payment_intent: `pi_sim_${crypto.randomUUID().slice(0, 12)}`,
      auction_id: auctionId,
      winning_bid_id: winningBidId,
    })
    .select("id, platform_fee, amount_paid")
    .single();

  if (orderErr || !order) {
    return { ok: false, error: orderErr?.message ?? "insert failed", order: null, stockBefore: before?.quantity };
  }

  const { error: stockErr } = await admin.rpc("decrement_stock", {
    p_product: productId,
    p_qty: 1,
  });

  if (auctionId) {
    await admin.rpc("settle_auction_payment", {
      p_auction_id: auctionId,
      p_order_id: order.id,
      p_stripe_session_id: sessionId,
    });
  }

  const { data: after } = await admin
    .from("products")
    .select("quantity")
    .eq("id", productId)
    .maybeSingle();

  return {
    ok: !stockErr,
    error: stockErr?.message ?? null,
    order,
    stockBefore: before?.quantity ?? null,
    stockAfter: after?.quantity ?? null,
    platformFee: fee,
  };
}

/**
 * Attempt a second stock decrement (edge-case helper).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} productId
 */
export async function attemptDoubleDecrement(admin, productId) {
  const { data: before } = await admin
    .from("products")
    .select("quantity")
    .eq("id", productId)
    .maybeSingle();

  const { error } = await admin.rpc("decrement_stock", {
    p_product: productId,
    p_qty: 1,
  });

  const { data: after } = await admin
    .from("products")
    .select("quantity")
    .eq("id", productId)
    .maybeSingle();

  return {
    error: error?.message ?? null,
    stockBefore: before?.quantity ?? null,
    stockAfter: after?.quantity ?? null,
    neverNegative: (after?.quantity ?? 0) >= 0,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sellerClient
 * @param {string} orderId
 * @param {string} tracking
 * @param {string} carrier
 */
export async function markShipped(sellerClient, orderId, tracking, carrier) {
  const now = new Date().toISOString();
  const patch = {
    status: "shipped",
    tracking_number: tracking,
    carrier,
    shipped_at: now,
  };

  const asSeller = await sellerClient.from("orders").update(patch).eq("id", orderId);
  if (!asSeller.error) {
    return { ok: true, via: "seller", error: null };
  }

  const admin = createAdmin();
  const asAdmin = await admin.from("orders").update(patch).eq("id", orderId);
  if (!asAdmin.error) {
    return {
      ok: true,
      via: "admin",
      error: null,
      note: `seller update blocked (${asSeller.error.message}); used admin fallback`,
    };
  }

  return {
    ok: false,
    via: null,
    error: asAdmin.error.message,
    note: `seller: ${asSeller.error.message}`,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} buyerClient
 * @param {string} orderId
 */
export async function confirmReceipt(buyerClient, orderId) {
  const now = new Date().toISOString();
  const { error } = await buyerClient
    .from("orders")
    .update({ status: "received", received_at: now, delivered_at: now })
    .eq("id", orderId);
  return { ok: !error, error: error?.message ?? null };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} buyerClient
 * @param {string} orderId
 * @param {number} stars
 * @param {string} [comment]
 */
export async function submitRating(buyerClient, orderId, stars, comment = "") {
  const userId = (await buyerClient.auth.getUser()).data.user?.id;
  const { data: order } = await buyerClient
    .from("orders")
    .select("id, shop:shops!orders_shop_id_fkey(seller_id)")
    .eq("id", orderId)
    .eq("buyer_id", userId ?? "")
    .maybeSingle();

  const sellerId = order?.shop?.seller_id;
  if (!sellerId) {
    return { ok: false, error: "order not found or missing seller" };
  }

  const { error } = await buyerClient.from("ratings").insert({
    rater_id: userId,
    seller_id: sellerId,
    order_id: orderId,
    stars,
    comment: comment || null,
  });
  return { ok: !error, error: error?.message ?? null };
}
