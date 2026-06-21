import { describe, it, expect } from "vitest";
import { isoToLocalInput, localInputToIso } from "@/lib/datetime";

describe("datetime conversion", () => {
  it("handles empty/invalid input", () => {
    expect(isoToLocalInput(null)).toBe("");
    expect(isoToLocalInput(undefined)).toBe("");
    expect(isoToLocalInput("not-a-date")).toBe("");
    expect(localInputToIso("")).toBe("");
    expect(localInputToIso("not-a-date")).toBe("");
  });

  it("localInputToIso returns a UTC ISO string", () => {
    const iso = localInputToIso("2026-06-21T14:30");
    expect(iso).toMatch(/Z$/);
    expect(Number.isNaN(new Date(iso).getTime())).toBe(false);
  });

  it("round-trips an ISO timestamp back to itself (timezone-independent)", () => {
    // The bug was a one-way timezone shift; the inverse pair must round-trip
    // regardless of the runner's timezone.
    const original = "2026-06-21T18:30:00.000Z";
    const local = isoToLocalInput(original);
    expect(localInputToIso(local)).toBe(original);
  });

  it("a future local time stays in the future after conversion", () => {
    const future = isoToLocalInput(new Date(Date.now() + 3_600_000).toISOString());
    const iso = localInputToIso(future);
    expect(new Date(iso).getTime()).toBeGreaterThan(Date.now());
  });
});
