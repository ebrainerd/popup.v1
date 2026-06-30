import { describe, expect, it } from "vitest";
import { isShopScheduleSet, PLACEHOLDER_SCHEDULE } from "@/lib/shop-schedule";

describe("shop schedule", () => {
  it("uses a stable placeholder window for unset drafts", () => {
    expect(PLACEHOLDER_SCHEDULE.end_at > PLACEHOLDER_SCHEDULE.start_at).toBe(true);
  });

  it("detects when the seller has chosen a schedule", () => {
    expect(isShopScheduleSet({ schedule_set: false })).toBe(false);
    expect(isShopScheduleSet({ schedule_set: true })).toBe(true);
  });
});
