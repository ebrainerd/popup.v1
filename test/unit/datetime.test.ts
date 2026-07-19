import { describe, it, expect } from "vitest";
import {
  formatInstantInTimeZone,
  formatShopOpenAt,
  formatShopScheduleMoment,
  formatShopScheduleWhen,
  isoToLocalInput,
  isoToZonedInput,
  localInputToIso,
  zonedInputToIso,
} from "@/lib/datetime";

describe("datetime conversion", () => {
  it("handles empty/invalid input", () => {
    expect(isoToLocalInput(null)).toBe("");
    expect(isoToLocalInput(undefined)).toBe("");
    expect(isoToLocalInput("not-a-date")).toBe("");
    expect(localInputToIso("")).toBe("");
    expect(localInputToIso("not-a-date")).toBe("");
    expect(isoToZonedInput(null, "UTC")).toBe("");
    expect(zonedInputToIso("", "UTC")).toBe("");
    expect(zonedInputToIso("nope", "America/Los_Angeles")).toBe("");
  });

  it("localInputToIso returns a UTC ISO string", () => {
    const iso = localInputToIso("2026-06-21T14:30");
    expect(iso).toMatch(/Z$/);
    expect(Number.isNaN(new Date(iso).getTime())).toBe(false);
  });

  it("round-trips an ISO timestamp via runtime-local helpers", () => {
    const original = "2026-06-21T18:30:00.000Z";
    const local = isoToLocalInput(original);
    expect(localInputToIso(local)).toBe(original);
  });

  it("round-trips wall clocks in America/Los_Angeles (PDT, UTC-7)", () => {
    // 10:00 PDT = 17:00 UTC
    const iso = zonedInputToIso("2026-07-19T10:00", "America/Los_Angeles");
    expect(iso).toBe("2026-07-19T17:00:00.000Z");
    expect(isoToZonedInput(iso, "America/Los_Angeles")).toBe("2026-07-19T10:00");
  });

  it("round-trips wall clocks in America/New_York (EDT, UTC-4)", () => {
    const iso = zonedInputToIso("2026-07-19T10:00", "America/New_York");
    expect(iso).toBe("2026-07-19T14:00:00.000Z");
    expect(isoToZonedInput(iso, "America/New_York")).toBe("2026-07-19T10:00");
  });

  it("round-trips wall clocks in UTC", () => {
    const iso = zonedInputToIso("2026-07-19T10:00", "UTC");
    expect(iso).toBe("2026-07-19T10:00:00.000Z");
    expect(isoToZonedInput(iso, "UTC")).toBe("2026-07-19T10:00");
  });

  it("a future zoned local time stays in the future after conversion", () => {
    const future = isoToZonedInput(
      new Date(Date.now() + 3_600_000).toISOString(),
      "America/Los_Angeles",
    );
    const iso = zonedInputToIso(future, "America/Los_Angeles");
    expect(new Date(iso).getTime()).toBeGreaterThan(Date.now());
  });

  it("formats Opens labels in the shop timezone (SSR-stable)", () => {
    const iso = "2026-07-19T17:00:00.000Z"; // 10:00am PDT
    const label = formatShopOpenAt(iso, "America/Los_Angeles");
    expect(label).toMatch(/10:00 AM/);
    expect(label).toMatch(/PDT|GMT-7|UTC-7/);
    // No ICU narrow/no-break spaces (would hydrate-mismatch Node vs browser).
    expect(label).not.toMatch(/[\u00a0\u202f\u2009]/);
    // Same input + zone must be deterministic (no runtime-local dependence).
    expect(formatShopOpenAt(iso, "America/Los_Angeles")).toBe(label);
    expect(formatShopScheduleWhen(iso, "America/New_York")).toMatch(/1:00 PM/);
  });

  it("formats close-shop schedule moments with zone (Chrome-safe option bag)", () => {
    const iso = "2026-07-19T17:00:00.000Z"; // 10:00am PDT
    const label = formatShopScheduleMoment(iso, "America/Los_Angeles");
    expect(label).toMatch(/Jul/);
    expect(label).toMatch(/19/);
    expect(label).toMatch(/2026/);
    expect(label).toMatch(/10:00 AM/);
    expect(label).toMatch(/PDT|GMT-7|UTC-7/);
    expect(label).not.toMatch(/[\u00a0\u202f\u2009]/);
  });

  it("degrades instead of throwing on an invalid option bag", () => {
    // Chrome also rejects dateStyle/timeStyle + timeZoneName ("Invalid option :
    // option"); Node is lenient for that mix, so we use an out-of-range value
    // that both engines reject to cover the catch path (Sentry POPUP-A).
    const iso = "2026-07-19T17:00:00.000Z";
    const label = formatInstantInTimeZone(iso, "America/Los_Angeles", {
      weekday: "option" as Intl.DateTimeFormatOptions["weekday"],
    });
    expect(label).toBeTruthy();
    expect(label).not.toMatch(/[\u00a0\u202f\u2009]/);
  });
});

