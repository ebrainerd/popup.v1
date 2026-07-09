"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { releaseOrderFunds } from "@/lib/payouts";

export type OrderActionState = { ok: boolean; error?: string };

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const shipSchema = z.object({
  tracking: z.string().trim().min(1, "Tracking number is required.").max(120),
  carrier: z.string().trim().min(1, "Carrier is required.").max(60),
});

/** Seller marks an order shipped + uploads tracking, then attempts fund release. */
export async function markShipped(
  orderId: string,
  tracking: string,
  carrier: string,
): Promise<OrderActionState> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const parsed = shipSchema.safeParse({ tracking, carrier });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Confirm the order belongs to a shop this user owns.
  const { data: order } = await supabase
    .from("orders")
    .select("id, shop_id, shop:shops!orders_shop_id_fkey(seller_id)")
    .eq("id", orderId)
    .maybeSingle();
  const sellerId = (order as unknown as { shop: { seller_id: string } | null } | null)?.shop
    ?.seller_id;
  if (!order || sellerId !== user.id) {
    return { ok: false, error: "Order not found." };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      status: "shipped",
      tracking_number: parsed.data.tracking,
      carrier: parsed.data.carrier,
      shipped_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  // Email the buyer that it shipped (best-effort, no-op without Resend).
  const { notifyOrderShipped } = await import("@/lib/notifications");
  await notifyOrderShipped(orderId);

  // Attempt release (respects the configured hold window; no-op if too early).
  await releaseOrderFunds(orderId);

  revalidatePath(`/dashboard/shops/${order.shop_id}`);
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard");
  revalidatePath("/orders");
  return { ok: true };
}

/** Buyer confirms they received the order; unlocks rating + tries fund release. */
export async function confirmReceipt(orderId: string): Promise<OrderActionState> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("orders")
    .update({ status: "received", received_at: now, delivered_at: now })
    .eq("id", orderId)
    .eq("buyer_id", user.id);
  if (error) return { ok: false, error: error.message };

  await releaseOrderFunds(orderId);

  // Let the seller know their buyer confirmed delivery (best-effort).
  const { notifyReceiptConfirmed } = await import("@/lib/notifications");
  await notifyReceiptConfirmed(orderId);

  revalidatePath("/orders");
  return { ok: true };
}

const ratingSchema = z.object({
  stars: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
});

/** Buyer rates the seller for a completed order (RLS enforces eligibility). */
export async function submitRating(
  orderId: string,
  stars: number,
  comment: string,
): Promise<OrderActionState> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const parsed = ratingSchema.safeParse({ stars, comment });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid rating." };
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, shop_id, buyer_id, shop:shops!orders_shop_id_fkey(seller_id)")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .maybeSingle();
  const sellerId = (order as unknown as { shop: { seller_id: string } | null } | null)?.shop
    ?.seller_id;
  if (!order || !sellerId) return { ok: false, error: "Order not found." };

  const { error } = await supabase.from("ratings").insert({
    rater_id: user.id,
    seller_id: sellerId,
    order_id: orderId,
    stars: parsed.data.stars,
    comment: parsed.data.comment || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/orders");
  return { ok: true };
}
