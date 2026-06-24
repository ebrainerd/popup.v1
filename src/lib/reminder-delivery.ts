import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { ReminderWindow } from "@/lib/drop-reminder-windows";

export type DeliveryStatus = "processing" | "sent" | "failed" | "skipped_no_provider";

/** Whether automated email reminders can be delivered in this environment. */
export function isEmailReminderDeliveryConfigured(): boolean {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) return false;
  // Default Resend sandbox sender cannot reach real buyers.
  if (from.includes("onboarding@resend.dev")) return false;
  return true;
}

export function isPushReminderDeliveryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

/** Any automated reminder channel is available for buyers. */
export function isReminderDeliveryConfigured(): boolean {
  return isEmailReminderDeliveryConfigured() || isPushReminderDeliveryConfigured();
}

export async function userHasPushSubscription(userId: string): Promise<boolean> {
  if (!isPushReminderDeliveryConfigured()) return false;
  const supabase = createServiceRoleClient();
  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}

/** True when this reminder has at least one deliverable channel right now. */
export async function canDeliverReminder(input: {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
}): Promise<boolean> {
  if (input.emailEnabled && isEmailReminderDeliveryConfigured()) return true;
  if (input.pushEnabled && (await userHasPushSubscription(input.userId))) return true;
  return false;
}

export type DeliveryClaim = "claimed" | "already_claimed" | "error";

/** Claim a reminder window for sending (idempotent under concurrency). */
export async function claimReminderDelivery(
  reminderId: string,
  window: ReminderWindow,
): Promise<DeliveryClaim> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("drop_reminder_deliveries").insert({
    reminder_id: reminderId,
    reminder_window: window,
    status: "processing",
  });
  if (error?.code === "23505") return "already_claimed";
  if (error) {
    console.error("claimReminderDelivery error", error.message);
    return "error";
  }
  return "claimed";
}

export async function finalizeReminderDelivery(
  reminderId: string,
  window: ReminderWindow,
  status: DeliveryStatus,
  opts?: { error?: string; markReminderSent?: boolean },
): Promise<void> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  await supabase
    .from("drop_reminder_deliveries")
    .update({
      status,
      sent_at: status === "sent" ? now : null,
      error: opts?.error ?? null,
    })
    .eq("reminder_id", reminderId)
    .eq("reminder_window", window);

  if (opts?.markReminderSent && status === "sent") {
    const { markReminderSent } = await import("@/lib/drop-reminders");
    await markReminderSent(reminderId, window);
  }
}
