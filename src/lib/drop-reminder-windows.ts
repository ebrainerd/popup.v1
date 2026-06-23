import type { DropReminder } from "@/lib/database.types";

export type ReminderWindow = "24h" | "1h" | "opening";

/** Reminder windows due for sending (pure logic for cron + tests). */
export function dueReminderWindows(
  startAt: string,
  now: Date,
  reminder: Pick<DropReminder, "before_24h_sent_at" | "before_1h_sent_at" | "opening_sent_at">,
): ReminderWindow[] {
  const start = new Date(startAt).getTime();
  const ms = now.getTime();
  const due: ReminderWindow[] = [];

  if (ms >= start && !reminder.opening_sent_at) {
    due.push("opening");
  }

  const oneHourBefore = start - 60 * 60 * 1000;
  if (ms >= oneHourBefore && ms < start && !reminder.before_1h_sent_at) {
    due.push("1h");
  }

  const dayBefore = start - 24 * 60 * 60 * 1000;
  if (ms >= dayBefore && ms < oneHourBefore && !reminder.before_24h_sent_at) {
    due.push("24h");
  }

  return due;
}
