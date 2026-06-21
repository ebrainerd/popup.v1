import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { getStripe } from "@/lib/stripe";
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
  if (!productId || !shopId || !buyerId) return;

  // Idempotency: skip if we already recorded this session.
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (existing) return;

  const amountPaid = session.amount_total ?? 0;
  const platformFee = Number(meta.platform_fee ?? 0);
  const shippingAmount = Number(meta.shipping_amount ?? 0);
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const shippingAddress =
    session.collected_information?.shipping_details ??
    session.customer_details ??
    null;

  const { error } = await supabase.from("orders").insert({
    buyer_id: buyerId,
    shop_id: shopId,
    product_id: productId,
    amount_paid: amountPaid,
    platform_fee: platformFee,
    shipping_amount: shippingAmount,
    shipping_address: shippingAddress as Record<string, unknown> | null,
    status: "paid",
    stripe_session_id: session.id,
    payment_intent: paymentIntent,
  });
  if (error) {
    console.error("Failed to insert order", error.message);
    return;
  }

  // Reduce available stock.
  await supabase.rpc("decrement_stock", { p_product: productId, p_qty: 1 });
}
