import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { DropReminder } from "@/lib/database.types";
import {
  dueReminderWindows,
  type ReminderWindow,
} from "@/lib/drop-reminder-windows";

export { dueReminderWindows, type ReminderWindow };

const WINDOW_COLUMNS: Record<ReminderWindow, keyof DropReminder> = {
  "24h": "before_24h_sent_at",
  "1h": "before_1h_sent_at",
  opening: "opening_sent_at",
};

/** Active reminder/waitlist count for a shop (public aggregate via RPC). */
export async function getDropReminderCount(shopId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("drop_reminder_count", {
    target_shop: shopId,
  });
  if (error) {
    console.error("getDropReminderCount error", error.message);
    return 0;
  }
  return Number(data ?? 0);
}

/** Whether the current user has an active reminder for this shop. */
export async function getUserDropReminder(
  shopId: string,
  userId: string,
): Promise<DropReminder | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("drop_reminders")
    .select("*")
    .eq("shop_id", shopId)
    .eq("user_id", userId)
    .is("cancelled_at", null)
    .maybeSingle();
  if (error) {
    console.error("getUserDropReminder error", error.message);
    return null;
  }
  return data as DropReminder | null;
}

/** Mark a reminder window as sent (idempotent). */
export async function markReminderSent(
  reminderId: string,
  window: ReminderWindow,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const sentAt = new Date().toISOString();
  const patch =
    window === "24h"
      ? { before_24h_sent_at: sentAt }
      : window === "1h"
        ? { before_1h_sent_at: sentAt }
        : { opening_sent_at: sentAt };
  const column = WINDOW_COLUMNS[window];
  await supabase.from("drop_reminders").update(patch).eq("id", reminderId).is(column, null);
}
