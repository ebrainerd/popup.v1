"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function postAnnouncement(
  shopId: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not logged in." };

  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 500) {
    return { ok: false, error: "Message must be 1–500 characters." };
  }

  const { data: shop } = await supabase
    .from("shops")
    .select("seller_id")
    .eq("id", shopId)
    .maybeSingle();
  if (!shop || shop.seller_id !== user.id) {
    return { ok: false, error: "Only the seller can post announcements." };
  }

  const { error } = await supabase.from("shop_announcements").insert({
    shop_id: shopId,
    seller_id: user.id,
    message: trimmed,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/shop/${shopId}`);
  return { ok: true };
}
