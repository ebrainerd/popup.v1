"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReminderResult = { subscribed: boolean; error?: string };

/** Add or remove a drop reminder for the current user. */
export async function toggleDropReminder(shopId: string): Promise<ReminderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { subscribed: false, error: "You must be logged in to set a reminder." };

  const { data: existing } = await supabase
    .from("drop_reminders")
    .select("id")
    .eq("shop_id", shopId)
    .eq("user_id", user.id)
    .is("cancelled_at", null)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("drop_reminders")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { subscribed: true, error: error.message };
    revalidatePath(`/shop/${shopId}`);
    revalidatePath(`/dashboard/shops/${shopId}`);
    return { subscribed: false };
  }

  const { isPushReminderDeliveryConfigured, userHasPushSubscription } = await import(
    "@/lib/reminder-delivery"
  );
  const pushEnabled =
    isPushReminderDeliveryConfigured() && (await userHasPushSubscription(user.id));

  const { error } = await supabase.from("drop_reminders").insert({
    shop_id: shopId,
    user_id: user.id,
    email_enabled: true,
    push_enabled: pushEnabled,
  });
  if (error) {
    if (error.code === "23505") return { subscribed: true };
    return { subscribed: false, error: error.message };
  }

  revalidatePath(`/shop/${shopId}`);
  revalidatePath(`/dashboard/shops/${shopId}`);
  return { subscribed: true };
}

/** Enable push for an existing reminder (after browser permission). */
export async function enableReminderPush(shopId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not logged in." };

  const { error } = await supabase
    .from("drop_reminders")
    .update({ push_enabled: true })
    .eq("shop_id", shopId)
    .eq("user_id", user.id)
    .is("cancelled_at", null);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
