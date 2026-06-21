"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getStripe, platformFee } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/env";
import { deriveShopStatus } from "@/lib/utils";

export type CheckoutResult = { ok: true; url: string } | { ok: false; error: string };

export async function createCheckoutSession(productId: string): Promise<CheckoutResult> {
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "Payments aren't enabled yet." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Log in to buy." };

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, title, price, discount_price, quantity, is_flash_only, flash_expires_at, shop_id",
    )
    .eq("id", productId)
    .maybeSingle();
  if (!product) return { ok: false, error: "Product not found." };
  if (product.quantity <= 0) return { ok: false, error: "This item is sold out." };

  const { data: shop } = await supabase
    .from("shops")
    .select("id, name, seller_id, shipping_rate, start_at, end_at")
    .eq("id", product.shop_id)
    .maybeSingle();
  if (!shop) return { ok: false, error: "Shop not found." };
  if (deriveShopStatus(shop.start_at, shop.end_at) !== "open") {
    return { ok: false, error: "This shop is closed." };
  }
  if (shop.seller_id === user.id) {
    return { ok: false, error: "You can't buy from your own shop." };
  }

  const { data: seller } = await supabase
    .from("profiles")
    .select("stripe_account_id, stripe_onboarded")
    .eq("id", shop.seller_id)
    .single();
  if (!seller?.stripe_account_id || !seller.stripe_onboarded) {
    return { ok: false, error: "This seller isn't set up to accept payments yet." };
  }

  const unitAmount =
    product.discount_price != null && product.discount_price < product.price
      ? product.discount_price
      : product.price;
  const shipping = shop.shipping_rate ?? 0;
  const total = unitAmount + shipping;
  const fee = platformFee(total);

  const site = getSiteUrl();

  // Atomically hold a unit for the duration of checkout. If we can't, the item
  // is sold out / fully reserved right now — fail clearly before payment.
  // 30 min = Stripe Checkout's minimum session lifetime; canceling releases
  // the hold immediately (see releaseMyHolds).
  const HOLD_MINUTES = 30;
  const { data: reservationId, error: reserveError } = await supabase.rpc("reserve_product", {
    p_product: product.id,
    p_buyer: user.id,
    p_session: null,
    p_ttl_minutes: HOLD_MINUTES,
  });
  if (reserveError) {
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
  if (!reservationId) {
    return { ok: false, error: "Sorry — this item just sold out." };
  }

  async function releaseReservation() {
    await supabase
      .from("product_reservations")
      .update({ status: "released" })
      .eq("id", reservationId as string);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: user.id,
      expires_at: Math.floor(Date.now() / 1000) + HOLD_MINUTES * 60,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            product_data: { name: `${product.title} — ${shop.name}` },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: ["US"] },
      ...(shipping > 0
        ? {
            shipping_options: [
              {
                shipping_rate_data: {
                  type: "fixed_amount",
                  fixed_amount: { amount: shipping, currency: "usd" },
                  display_name: "Flat-rate shipping",
                },
              },
            ],
          }
        : {}),
      payment_intent_data: {
        metadata: {
          product_id: product.id,
          shop_id: shop.id,
          buyer_id: user.id,
        },
      },
      metadata: {
        product_id: product.id,
        shop_id: shop.id,
        buyer_id: user.id,
        seller_account: seller.stripe_account_id,
        platform_fee: String(fee),
        shipping_amount: String(shipping),
        reservation_id: reservationId as string,
      },
      success_url: `${site}/orders?checkout=success`,
      cancel_url: `${site}/shop/${shop.id}?checkout=canceled`,
    });

    if (!session.url) {
      await releaseReservation();
      return { ok: false, error: "Could not start checkout." };
    }

    // Link the hold to the Stripe session so the webhook can complete/release it.
    await supabase
      .from("product_reservations")
      .update({ session_id: session.id })
      .eq("id", reservationId as string);

    return { ok: true, url: session.url };
  } catch (err) {
    await releaseReservation();
    return { ok: false, error: err instanceof Error ? err.message : "Checkout failed." };
  }
}

/**
 * Release the current buyer's active holds for a shop — called when they cancel
 * checkout and return to the shop, so the item frees up immediately instead of
 * waiting for the Stripe session to expire. Also expires the Stripe session so
 * it can't be completed later.
 */
export async function releaseMyHolds(shopId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createServiceRoleClient();
  const { data: products } = await admin.from("products").select("id").eq("shop_id", shopId);
  const ids = (products ?? []).map((p) => p.id);
  if (ids.length === 0) return;

  const { data: holds } = await admin
    .from("product_reservations")
    .select("id, session_id")
    .eq("buyer_id", user.id)
    .eq("status", "held")
    .in("product_id", ids);
  if (!holds || holds.length === 0) return;

  const stripe = getStripe();
  if (stripe) {
    await Promise.allSettled(
      holds
        .filter((h) => h.session_id)
        .map((h) => stripe.checkout.sessions.expire(h.session_id as string)),
    );
  }

  await admin
    .from("product_reservations")
    .update({ status: "released" })
    .in(
      "id",
      holds.map((h) => h.id),
    );

  revalidatePath(`/shop/${shopId}`);
}
