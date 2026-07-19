"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { releaseOrderFunds } from "@/lib/payouts";
import { filterProfanity } from "@/lib/profanity";
import {
  ORDER_MESSAGE_MAX_LENGTH,
  ORDER_MESSAGE_RATE_LIMIT_MAX,
  ORDER_MESSAGE_RATE_LIMIT_WINDOW_MS,
  canEscalateHelpRequest,
  isConversationArchived,
  isOrderParty,
} from "@/lib/order-conversation";
import type { OrderHelpReason, OrderHelpRequest } from "@/lib/database.types";

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

// ===========================================================================
// Order-scoped messaging + "Need help with this order"
// ===========================================================================

type OrderParties = {
  shopId: string;
  buyerId: string;
  sellerId: string;
};

/** Load the order and confirm the current user is the buyer or the seller. */
async function getOrderAsParty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
  userId: string,
): Promise<OrderParties | null> {
  const { data: order } = await supabase
    .from("orders")
    .select("id, shop_id, buyer_id, shop:shops!orders_shop_id_fkey(seller_id)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;
  const sellerId = (order as unknown as { shop: { seller_id: string } | null }).shop?.seller_id;
  if (!sellerId || !isOrderParty(userId, order.buyer_id, sellerId)) return null;
  return { shopId: order.shop_id, buyerId: order.buyer_id, sellerId };
}

async function getResolvedUserIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("order_conversation_resolutions")
    .select("user_id")
    .eq("order_id", orderId);
  return (data ?? []).map((r) => r.user_id);
}

function revalidateOrderConversation(shopId: string) {
  revalidatePath("/orders");
  revalidatePath("/dashboard/sales");
  revalidatePath(`/dashboard/shops/${shopId}`);
}

export type OrderConversationMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender: { username: string; display_name: string | null } | null;
};

export type OrderConversation = {
  ok: true;
  viewerId: string;
  messages: OrderConversationMessage[];
  helpRequest: OrderHelpRequest | null;
  /** True once BOTH parties marked the conversation resolved (composer hidden). */
  archived: boolean;
  /** True when the current viewer has marked the conversation resolved. */
  viewerResolved: boolean;
  /** True when the other party has marked the conversation resolved. */
  otherResolved: boolean;
};

export type OrderConversationState = OrderConversation | { ok: false; error: string };

/** Load the order conversation (messages, help request, resolution state). */
export async function getOrderConversation(orderId: string): Promise<OrderConversationState> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const parties = await getOrderAsParty(supabase, orderId, user.id);
  if (!parties) return { ok: false, error: "Order not found." };

  const [{ data: messages }, { data: helpRequests }, resolvedUserIds] = await Promise.all([
    supabase
      .from("order_messages")
      .select(
        `id, sender_id, body, created_at,
         sender:profiles!order_messages_sender_id_fkey(username, display_name)`,
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("order_help_requests")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1),
    getResolvedUserIds(supabase, orderId),
  ]);

  const otherPartyId = user.id === parties.buyerId ? parties.sellerId : parties.buyerId;
  return {
    ok: true,
    viewerId: user.id,
    messages: (messages ?? []) as unknown as OrderConversationMessage[],
    helpRequest: (helpRequests?.[0] as OrderHelpRequest | undefined) ?? null,
    archived: isConversationArchived(resolvedUserIds, parties.buyerId, parties.sellerId),
    viewerResolved: resolvedUserIds.includes(user.id),
    otherResolved: resolvedUserIds.includes(otherPartyId),
  };
}

const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Message is empty.")
    .max(ORDER_MESSAGE_MAX_LENGTH, `Message is too long (max ${ORDER_MESSAGE_MAX_LENGTH}).`),
});

/** Buyer or seller sends a message on an order thread. */
export async function sendOrderMessage(orderId: string, body: string): Promise<OrderActionState> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const parsed = messageSchema.safeParse({ body });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message." };
  }

  const parties = await getOrderAsParty(supabase, orderId, user.id);
  if (!parties) return { ok: false, error: "Order not found." };

  const resolvedUserIds = await getResolvedUserIds(supabase, orderId);
  if (isConversationArchived(resolvedUserIds, parties.buyerId, parties.sellerId)) {
    return { ok: false, error: "This conversation is resolved. Reopen it to send a message." };
  }

  // Simple per-user per-order rate limit.
  const since = new Date(Date.now() - ORDER_MESSAGE_RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("order_messages")
    .select("*", { count: "exact", head: true })
    .eq("order_id", orderId)
    .eq("sender_id", user.id)
    .gt("created_at", since);
  if ((count ?? 0) >= ORDER_MESSAGE_RATE_LIMIT_MAX) {
    return { ok: false, error: "You're sending messages too fast. Try again in a few minutes." };
  }

  const { error } = await supabase.from("order_messages").insert({
    order_id: orderId,
    sender_id: user.id,
    body: filterProfanity(parsed.data.body),
  });
  if (error) return { ok: false, error: error.message };

  // Email the other party (best-effort, no-op without Resend).
  const { notifyOrderMessage } = await import("@/lib/notifications");
  await notifyOrderMessage(orderId, user.id);

  revalidateOrderConversation(parties.shopId);
  return { ok: true };
}

const helpSchema = z.object({
  reason: z.enum(["shipping", "wrong_item", "damaged", "not_received", "other"]),
  message: z
    .string()
    .trim()
    .min(1, "Tell us what went wrong.")
    .max(ORDER_MESSAGE_MAX_LENGTH, `Message is too long (max ${ORDER_MESSAGE_MAX_LENGTH}).`),
});

/**
 * Buyer or seller opens "Need help with this order": creates the help request
 * plus its first message and notifies the other party (not PopUp support —
 * escalation is a separate second step).
 */
export async function openOrderHelp(
  orderId: string,
  reason: OrderHelpReason,
  message: string,
): Promise<OrderActionState> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const parsed = helpSchema.safeParse({ reason, message });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid help request." };
  }

  const parties = await getOrderAsParty(supabase, orderId, user.id);
  if (!parties) return { ok: false, error: "Order not found." };

  const cleanMessage = filterProfanity(parsed.data.message);
  const { error } = await supabase.from("order_help_requests").insert({
    order_id: orderId,
    opened_by: user.id,
    reason: parsed.data.reason,
    message: cleanMessage,
  });
  if (error) {
    // Unique partial index: one open help request per order.
    if (error.code === "23505") {
      return { ok: false, error: "A help request is already open for this order." };
    }
    return { ok: false, error: error.message };
  }

  // The help message doubles as the first thread message.
  await supabase.from("order_messages").insert({
    order_id: orderId,
    sender_id: user.id,
    body: cleanMessage,
  });

  // Opening help reopens the conversation if the opener had resolved it.
  await supabase
    .from("order_conversation_resolutions")
    .delete()
    .eq("order_id", orderId)
    .eq("user_id", user.id);

  const { notifyOrderHelpOpened } = await import("@/lib/notifications");
  await notifyOrderHelpOpened(orderId, user.id, parsed.data.reason, cleanMessage);

  revalidateOrderConversation(parties.shopId);
  return { ok: true };
}

/**
 * Second step after opening help: escalate the open help request to PopUp
 * support. Emails support@ and notes it in the thread for the other party.
 * Calling it again after escalation is a no-op.
 */
export async function escalateOrderHelp(orderId: string): Promise<OrderActionState> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const parties = await getOrderAsParty(supabase, orderId, user.id);
  if (!parties) return { ok: false, error: "Order not found." };

  const { data: help } = await supabase
    .from("order_help_requests")
    .select("*")
    .eq("order_id", orderId)
    .eq("status", "open")
    .maybeSingle();
  if (!help) return { ok: false, error: "Open a help request first." };
  if (!canEscalateHelpRequest(help)) return { ok: true }; // already escalated — idempotent

  const { error } = await supabase
    .from("order_help_requests")
    .update({ escalated_at: new Date().toISOString() })
    .eq("id", help.id)
    .is("escalated_at", null);
  if (error) return { ok: false, error: error.message };

  const { notifyOrderHelpEscalated } = await import("@/lib/notifications");
  await notifyOrderHelpEscalated(orderId, user.id, help as OrderHelpRequest);

  revalidateOrderConversation(parties.shopId);
  return { ok: true };
}

/**
 * Mark the conversation resolved for the current user. When both parties have
 * resolved, the conversation archives (composer hidden, history readable) and
 * any open help request is closed.
 */
export async function markOrderConversationResolved(orderId: string): Promise<OrderActionState> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const parties = await getOrderAsParty(supabase, orderId, user.id);
  if (!parties) return { ok: false, error: "Order not found." };

  const { error } = await supabase
    .from("order_conversation_resolutions")
    .upsert({ order_id: orderId, user_id: user.id, resolved_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };

  const resolvedUserIds = await getResolvedUserIds(supabase, orderId);
  if (isConversationArchived(resolvedUserIds, parties.buyerId, parties.sellerId)) {
    await supabase
      .from("order_help_requests")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("order_id", orderId)
      .eq("status", "open");
  }

  revalidateOrderConversation(parties.shopId);
  return { ok: true };
}

/** Clear the current user's resolution, reopening the conversation for both. */
export async function reopenOrderConversation(orderId: string): Promise<OrderActionState> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const parties = await getOrderAsParty(supabase, orderId, user.id);
  if (!parties) return { ok: false, error: "Order not found." };

  const { error } = await supabase
    .from("order_conversation_resolutions")
    .delete()
    .eq("order_id", orderId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidateOrderConversation(parties.shopId);
  return { ok: true };
}
