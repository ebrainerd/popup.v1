"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LiveReminderResult = { subscribed: boolean; error?: string };

/** Add or remove a live-stream alert for the current user. */
export async function toggleLiveReminder(shopId: string): Promise<LiveReminderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { subscribed: false, error: "You must be logged in." };

  const { data: existing } = await supabase
    .from("live_reminders")
    .select("id")
    .eq("shop_id", shopId)
    .eq("user_id", user.id)
    .is("cancelled_at", null)
    .is("notified_at", null)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("live_reminders")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { subscribed: true, error: error.message };
    revalidatePath(`/shop/${shopId}`);
    return { subscribed: false };
  }

  const { error } = await supabase.from("live_reminders").insert({
    shop_id: shopId,
    user_id: user.id,
  });
  if (error) {
    // Legacy row may still block the unique index (notified but not cancelled).
    if (error.code === "23505") {
      const { error: reactivateError } = await supabase
        .from("live_reminders")
        .update({
          cancelled_at: null,
          notified_at: null,
          created_at: new Date().toISOString(),
        })
        .eq("shop_id", shopId)
        .eq("user_id", user.id)
        .is("cancelled_at", null);
      if (reactivateError) return { subscribed: false, error: reactivateError.message };
      revalidatePath(`/shop/${shopId}`);
      return { subscribed: true };
    }
    return { subscribed: false, error: error.message };
  }

  revalidatePath(`/shop/${shopId}`);
  return { subscribed: true };
}
