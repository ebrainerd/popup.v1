"use server";

import { createClient } from "@/lib/supabase/server";
import { filterProfanity } from "@/lib/profanity";
import { deriveShopStatus } from "@/lib/utils";
import type { ChatBroadcast } from "@/lib/realtime";

const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX = 5;

export type SendMessageResult =
  | { ok: true; message: ChatBroadcast }
  | { ok: false; error: string };

export async function sendChatMessage(
  shopId: string,
  rawMessage: string,
): Promise<SendMessageResult> {
  const text = rawMessage.trim();
  if (!text) return { ok: false, error: "Message is empty." };
  if (text.length > 500) return { ok: false, error: "Message is too long (max 500)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Log in to chat." };

  const { data: shop } = await supabase
    .from("shops")
    .select("start_at, end_at")
    .eq("id", shopId)
    .maybeSingle();
  if (!shop) return { ok: false, error: "Shop not found." };
  if (deriveShopStatus(shop.start_at, shop.end_at) !== "open") {
    return { ok: false, error: "Chat is only open while the shop is open." };
  }

  // Muted users cannot post (also enforced by RLS as defense-in-depth).
  const { data: muted } = await supabase.rpc("is_muted", {
    target_shop: shopId,
    target_user: user.id,
  });
  if (muted) return { ok: false, error: "You have been muted in this shop." };

  // Simple per-user rate limit.
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("chat_messages")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("user_id", user.id)
    .gt("created_at", since);
  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return { ok: false, error: "You're sending messages too fast. Slow down." };
  }

  const clean = filterProfanity(text);

  const { data: inserted, error } = await supabase
    .from("chat_messages")
    .insert({ shop_id: shopId, user_id: user.id, message: clean })
    .select("id, message, created_at")
    .single();
  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Could not send message." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    ok: true,
    message: {
      id: inserted.id,
      message: inserted.message,
      created_at: inserted.created_at,
      user: {
        id: user.id,
        username: profile?.username ?? "user",
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      },
    },
  };
}

export type MuteResult = { ok: boolean; error?: string; username?: string };

export async function muteUser(shopId: string, userId: string): Promise<MuteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  // Ownership enforced by RLS; this gives a clearer early error.
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!shop) return { ok: false, error: "Only the seller can mute users." };

  const { error } = await supabase
    .from("shop_mutes")
    .upsert({ shop_id: shopId, user_id: userId, muted_by: user.id });
  if (error) return { ok: false, error: error.message };

  // Hide the muted user's existing messages from history loads.
  await supabase
    .from("chat_messages")
    .update({ is_hidden: true })
    .eq("shop_id", shopId)
    .eq("user_id", userId);

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single();

  return { ok: true, username: profile?.username ?? "user" };
}
