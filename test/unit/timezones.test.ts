import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCHEDULE_TIMEZONE,
  resolveScheduleTimeZone,
  scheduleTimeZoneOptions,
} from "@/lib/timezones";

describe("schedule timezones", () => {
  it("puts the preferred zone first so the select never looks like Hawaii by default", () => {
    const options = scheduleTimeZoneOptions("America/New_York");
    expect(options[0]?.value).toBe("America/New_York");
    expect(options.some((z) => z.value === "Pacific/Honolulu")).toBe(true);
  });

  it("injects unknown preferred zones at the front", () => {
    const options = scheduleTimeZoneOptions("Pacific/Guam");
    expect(options[0]?.value).toBe("Pacific/Guam");
  });

  it("resolveScheduleTimeZone prefers saved values", () => {
    expect(resolveScheduleTimeZone("America/Chicago")).toBe("America/Chicago");
    expect(resolveScheduleTimeZone("  Europe/London  ")).toBe("Europe/London");
  });

  it("resolveScheduleTimeZone falls back when unset", () => {
    const resolved = resolveScheduleTimeZone(null);
    expect(resolved.length).toBeGreaterThan(0);
    // In this VM Intl usually reports UTC; either way it must be a real IANA id.
    expect(resolved === DEFAULT_SCHEDULE_TIMEZONE || resolved.includes("/")).toBe(true);
  });
});
