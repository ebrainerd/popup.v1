import { describe, expect, it } from "vitest";
import { dueReminderWindows } from "@/lib/drop-reminder-windows";

describe("dueReminderWindows", () => {
  const empty = {
    before_24h_sent_at: null,
    before_1h_sent_at: null,
    opening_sent_at: null,
  };

  it("returns opening when shop has started", () => {
    const startAt = new Date("2026-06-01T12:00:00Z").toISOString();
    const now = new Date("2026-06-01T12:05:00Z");
    expect(dueReminderWindows(startAt, now, empty)).toContain("opening");
  });

  it("returns 1h when within the hour before open", () => {
    const startAt = new Date("2026-06-01T12:00:00Z").toISOString();
    const now = new Date("2026-06-01T11:30:00Z");
    expect(dueReminderWindows(startAt, now, empty)).toContain("1h");
    expect(dueReminderWindows(startAt, now, empty)).not.toContain("opening");
  });

  it("returns 24h when within the day before open", () => {
    const startAt = new Date("2026-06-02T12:00:00Z").toISOString();
    const now = new Date("2026-06-01T12:30:00Z");
    expect(dueReminderWindows(startAt, now, empty)).toContain("24h");
  });

  it("skips windows already sent", () => {
    const startAt = new Date("2026-06-01T12:00:00Z").toISOString();
    const now = new Date("2026-06-01T12:05:00Z");
    expect(
      dueReminderWindows(startAt, now, {
        ...empty,
        opening_sent_at: now.toISOString(),
      }),
    ).not.toContain("opening");
  });
});
