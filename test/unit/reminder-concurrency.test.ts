import { describe, expect, it } from "vitest";
import {
  resolveDeliveryClaim,
  resolveReminderDeliveryOutcome,
} from "@/lib/reminder-delivery";

const NOW = Date.parse("2026-06-23T12:00:00.000Z");

describe("resolveDeliveryClaim", () => {
  it("inserts when no prior delivery exists", () => {
    expect(resolveDeliveryClaim(null, NOW)).toBe("insert");
  });

  it("blocks duplicate claims after sent", () => {
    expect(
      resolveDeliveryClaim(
        { status: "sent", attempted_at: "2026-06-23T11:00:00.000Z" },
        NOW,
      ),
    ).toBe("already_claimed");
  });

  it("blocks concurrent processing claims", () => {
    expect(
      resolveDeliveryClaim(
        { status: "processing", attempted_at: "2026-06-23T11:55:00.000Z" },
        NOW,
      ),
    ).toBe("already_claimed");
  });

  it("retries failed deliveries", () => {
    expect(
      resolveDeliveryClaim(
        { status: "failed", attempted_at: "2026-06-23T10:00:00.000Z" },
        NOW,
      ),
    ).toBe("retry");
  });

  it("retries skipped_no_provider deliveries", () => {
    expect(
      resolveDeliveryClaim(
        { status: "skipped_no_provider", attempted_at: "2026-06-23T10:00:00.000Z" },
        NOW,
      ),
    ).toBe("retry");
  });

  it("retries stale processing claims", () => {
    expect(
      resolveDeliveryClaim(
        { status: "processing", attempted_at: "2026-06-23T11:00:00.000Z" },
        NOW,
      ),
    ).toBe("retry");
  });
});

describe("resolveReminderDeliveryOutcome", () => {
  it("marks sent only when at least one enabled channel succeeds", () => {
    expect(
      resolveReminderDeliveryOutcome({
        emailWanted: true,
        pushWanted: true,
        emailSucceeded: false,
        pushSucceeded: true,
      }),
    ).toBe("sent");
  });

  it("marks failed when enabled channels were attempted but none succeeded", () => {
    expect(
      resolveReminderDeliveryOutcome({
        emailWanted: true,
        pushWanted: false,
        emailSucceeded: false,
        pushSucceeded: false,
      }),
    ).toBe("failed");
  });

  it("marks skipped when no channel was deliverable", () => {
    expect(
      resolveReminderDeliveryOutcome({
        emailWanted: false,
        pushWanted: false,
        emailSucceeded: false,
        pushSucceeded: false,
      }),
    ).toBe("skipped_no_provider");
  });
});
