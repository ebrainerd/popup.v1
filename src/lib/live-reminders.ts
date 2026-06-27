import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LiveReminder } from "@/lib/database.types";

/** Active live-reminder count for a shop (public aggregate via RPC). */
export async function getLiveReminderCount(shopId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("live_reminder_count", {
    target_shop: shopId,
  });
  if (error) {
    console.error("getLiveReminderCount error", error.message);
    return 0;
  }
  return Number(data ?? 0);
}

/** Whether the current user has an active live reminder for this shop. */
export async function getUserLiveReminder(
  shopId: string,
  userId: string,
): Promise<LiveReminder | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("live_reminders")
    .select("*")
    .eq("shop_id", shopId)
    .eq("user_id", userId)
    .is("cancelled_at", null)
    .maybeSingle();
  if (error) {
    console.error("getUserLiveReminder error", error.message);
    return null;
  }
  return data as LiveReminder | null;
}
