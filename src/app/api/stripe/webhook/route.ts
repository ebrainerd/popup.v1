import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { getStripe, platformFee } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata ?? {};
        if (meta.auction_id) {
          await supabase.rpc("expire_auction_payment", {
            p_auction_id: meta.auction_id,
          });
        }
        // Buyer abandoned checkout — free the held unit.
        await supabase
          .from("product_reservations")
          .update({ status: "released" })
          .eq("session_id", session.id)
          .eq("status", "held");
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const onboarded = Boolean(account.charges_enabled && account.details_submitted);
        await supabase
          .from("profiles")
          .update({ stripe_onboarded: onboarded })
          .eq("stripe_account_id", account.id);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error", err);
    Sentry.captureException(err, { tags: { area: "stripe_webhook", event: event.type } });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

async function handleCheckoutCompleted(
  supabase: ServiceClient,
  session: Stripe.Checkout.Session,
) {
  const meta = session.metadata ?? {};
  const productId = meta.product_id;
  const shopId = meta.shop_id;
  const buyerId = meta.buyer_id;
  const auctionId = meta.auction_id ?? null;
  const winningBidId = meta.winning_bid_id ?? null;
  if (!productId || !shopId || !buyerId) return;

  // Idempotency: skip if we already recorded this session.
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (existing) return;

  const amountPaid = session.amount_total ?? 0;
  const shippingAmount = Number(meta.shipping_amount ?? 0);
  // Never trust fee metadata: recompute from the captured amount so a stale
  // or tampered session value can't shortchange the platform cut.
  const fee = platformFee(amountPaid);
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // Defense-in-depth: sanity-check the captured amount against the DB.
  // Sessions are created server-side from DB prices, so a mismatch means a
  // bug or dashboard tampering. Money is already captured at this point, so
  // record the order either way but alert loudly for investigation.
  await validateCapturedAmount(supabase, session, {
    productId,
    auctionId,
    amountPaid,
    shippingAmount,
  });

  const shippingAddress =
    session.collected_information?.shipping_details ??
    session.customer_details ??
    null;

  const { data: inserted, error } = await supabase
    .from("orders")
    .insert({
      buyer_id: buyerId,
      shop_id: shopId,
      product_id: productId,
      amount_paid: amountPaid,
      platform_fee: fee,
      shipping_amount: shippingAmount,
      shipping_address: shippingAddress as Record<string, unknown> | null,
      status: "paid",
      stripe_session_id: session.id,
      payment_intent: paymentIntent,
      auction_id: auctionId,
      winning_bid_id: winningBidId || null,
    })
    .select("id")
    .single();
  if (error || !inserted) {
    // Throw so the route returns 500 and Stripe retries; the insert is
    // idempotent on stripe_session_id, so retries are safe. Swallowing this
    // would leave a captured payment with no order record.
    throw new Error(`Failed to insert order for session ${session.id}: ${error?.message}`);
  }

  // Reduce available stock and mark the hold as completed. If the buyer's
  // hold lapsed and stock ran out in the meantime, flag the potential
  // oversell for manual follow-up (payment is already captured).
  const { data: reservation } = await supabase
    .from("product_reservations")
    .select("id, status, expires_at")
    .eq("session_id", session.id)
    .maybeSingle();
  if (!reservation || reservation.status === "released") {
    const { data: product } = await supabase
      .from("products")
      .select("quantity")
      .eq("id", productId)
      .maybeSingle();
    if ((product?.quantity ?? 0) <= 0) {
      Sentry.captureMessage("Paid checkout without stock or active hold (possible oversell)", {
        level: "error",
        tags: { area: "stripe_webhook" },
        extra: { sessionId: session.id, productId },
      });
    }
  }
  await supabase.rpc("decrement_stock", { p_product: productId, p_qty: 1 });
  await supabase
    .from("product_reservations")
    .update({ status: "completed" })
    .eq("session_id", session.id);

  if (auctionId) {
    await supabase.rpc("settle_auction_payment", {
      p_auction_id: auctionId,
      p_order_id: inserted.id,
      p_stripe_session_id: session.id,
    });
  }

  // Email buyer + seller (best-effort, no-op without Resend configured).
  const { notifyOrderPlaced } = await import("@/lib/notifications");
  await notifyOrderPlaced(inserted.id);
}

/**
 * Compare the captured amount against what the database says the buyer
 * should have paid. Auction wins are exact (the winning bid is frozen once
 * the run awaits payment); buy-now uses the current price/discount, which can
 * legitimately drift if a flash deal changed mid-checkout, so both paths only
 * alert (never block the order for money already captured).
 */
async function validateCapturedAmount(
  supabase: ServiceClient,
  session: Stripe.Checkout.Session,
  input: { productId: string; auctionId: string | null; amountPaid: number; shippingAmount: number },
) {
  try {
    let expectedUnit: number | null = null;
    if (input.auctionId) {
      const { data: run } = await supabase
        .from("auction_runs")
        .select("current_bid")
        .eq("id", input.auctionId)
        .maybeSingle();
      expectedUnit = run?.current_bid ?? null;
    } else {
      const { data: product } = await supabase
        .from("products")
        .select("price, discount_price")
        .eq("id", input.productId)
        .maybeSingle();
      expectedUnit = product ? (product.discount_price ?? product.price) : null;
    }
    if (expectedUnit == null) return;

    // Checkout sessions are always for a single unit.
    const expectedTotal = expectedUnit + input.shippingAmount;
    if (expectedTotal !== input.amountPaid) {
      Sentry.captureMessage("Stripe session amount does not match database price", {
        level: input.auctionId ? "error" : "warning",
        tags: { area: "stripe_webhook" },
        extra: {
          sessionId: session.id,
          productId: input.productId,
          auctionId: input.auctionId,
          amountPaid: input.amountPaid,
          expectedTotal,
          expectedUnit,
          shippingAmount: input.shippingAmount,
        },
      });
    }
  } catch (err) {
    // Validation must never take down order recording.
    console.error("validateCapturedAmount failed", err);
  }
}
