import { describe, expect, it } from "vitest";

/** Mirrors unique-claim semantics for concurrent cron invocations. */
function claimDelivery(existing: Set<string>, reminderId: string, window: string) {
  const key = `${reminderId}:${window}`;
  if (existing.has(key)) return "already_claimed" as const;
  existing.add(key);
  return "claimed" as const;
}

describe("reminder delivery concurrency", () => {
  it("allows only one claim per reminder window", () => {
    const claims = new Set<string>();
    const first = claimDelivery(claims, "r1", "opening");
    const second = claimDelivery(claims, "r1", "opening");
    expect(first).toBe("claimed");
    expect(second).toBe("already_claimed");
  });

  it("allows separate windows for the same reminder", () => {
    const claims = new Set<string>();
    expect(claimDelivery(claims, "r1", "24h")).toBe("claimed");
    expect(claimDelivery(claims, "r1", "1h")).toBe("claimed");
  });
});
