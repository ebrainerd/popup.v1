import { describe, expect, it } from "vitest";
import { computeEndShopTimes, deriveShopStatus } from "@/lib/utils";

describe("computeEndShopTimes", () => {
  it("closes an open shop at now", () => {
    const start = "2026-06-01T10:00:00Z";
    const end = "2026-06-01T14:00:00Z";
    const now = new Date("2026-06-01T12:00:00Z");
    const times = computeEndShopTimes(start, end, now);
    expect(times.start_at).toBe(new Date(start).toISOString());
    expect(times.end_at).toBe(now.toISOString());
    expect(deriveShopStatus(times.start_at, times.end_at, now)).toBe("ended");
  });

  it("collapses a scheduled shop that never opened", () => {
    const start = "2026-06-01T18:00:00Z";
    const end = "2026-06-01T22:00:00Z";
    const now = new Date("2026-06-01T12:00:00Z");
    const times = computeEndShopTimes(start, end, now);
    expect(new Date(times.end_at).getTime()).toBeGreaterThan(new Date(times.start_at).getTime());
    expect(deriveShopStatus(times.start_at, times.end_at, now)).toBe("ended");
  });

  it("returns unchanged times when already ended", () => {
    const start = "2026-06-01T10:00:00Z";
    const end = "2026-06-01T12:00:00Z";
    const now = new Date("2026-06-01T14:00:00Z");
    const times = computeEndShopTimes(start, end, now);
    expect(times.start_at).toBe(new Date(start).toISOString());
    expect(times.end_at).toBe(new Date(end).toISOString());
  });
});
