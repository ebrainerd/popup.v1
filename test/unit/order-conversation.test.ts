import { describe, it, expect } from "vitest";
import {
  ORDER_HELP_REASONS,
  canEscalateHelpRequest,
  isConversationArchived,
  isOrderParty,
  orderHelpReasonLabel,
} from "@/lib/order-conversation";

const BUYER = "buyer-1";
const SELLER = "seller-1";
const STRANGER = "someone-else";

describe("isOrderParty", () => {
  it("accepts the buyer", () => {
    expect(isOrderParty(BUYER, BUYER, SELLER)).toBe(true);
  });

  it("accepts the seller", () => {
    expect(isOrderParty(SELLER, BUYER, SELLER)).toBe(true);
  });

  it("rejects anyone else", () => {
    expect(isOrderParty(STRANGER, BUYER, SELLER)).toBe(false);
  });

  it("rejects a non-buyer when the seller is unknown", () => {
    expect(isOrderParty(STRANGER, BUYER, null)).toBe(false);
    expect(isOrderParty(BUYER, BUYER, undefined)).toBe(true);
  });
});

describe("isConversationArchived", () => {
  it("is not archived with no resolutions", () => {
    expect(isConversationArchived([], BUYER, SELLER)).toBe(false);
  });

  it("is not archived when only the buyer resolved", () => {
    expect(isConversationArchived([BUYER], BUYER, SELLER)).toBe(false);
  });

  it("is not archived when only the seller resolved", () => {
    expect(isConversationArchived([SELLER], BUYER, SELLER)).toBe(false);
  });

  it("is archived once BOTH parties resolved", () => {
    expect(isConversationArchived([BUYER, SELLER], BUYER, SELLER)).toBe(true);
    expect(isConversationArchived([SELLER, BUYER], BUYER, SELLER)).toBe(true);
  });

  it("ignores resolution rows from non-parties", () => {
    expect(isConversationArchived([STRANGER, BUYER], BUYER, SELLER)).toBe(false);
  });

  it("reopens when either party clears their resolution", () => {
    // Both resolved → archived; seller clears theirs → open again.
    expect(isConversationArchived([BUYER, SELLER], BUYER, SELLER)).toBe(true);
    expect(isConversationArchived([BUYER], BUYER, SELLER)).toBe(false);
  });

  it("never archives when the seller is unknown", () => {
    expect(isConversationArchived([BUYER], BUYER, null)).toBe(false);
  });
});

describe("canEscalateHelpRequest", () => {
  it("requires an existing help request", () => {
    expect(canEscalateHelpRequest(null)).toBe(false);
    expect(canEscalateHelpRequest(undefined)).toBe(false);
  });

  it("allows escalating an open, not-yet-escalated request", () => {
    expect(canEscalateHelpRequest({ status: "open", escalated_at: null })).toBe(true);
  });

  it("blocks a second escalation (escalate is shown once)", () => {
    expect(
      canEscalateHelpRequest({ status: "open", escalated_at: "2026-07-19T00:00:00Z" }),
    ).toBe(false);
  });

  it("blocks escalating a resolved request", () => {
    expect(canEscalateHelpRequest({ status: "resolved", escalated_at: null })).toBe(false);
  });
});

describe("orderHelpReasonLabel", () => {
  it("labels every reason in the picker", () => {
    for (const { value, label } of ORDER_HELP_REASONS) {
      expect(orderHelpReasonLabel(value)).toBe(label);
    }
  });

  it("covers all five schema reasons", () => {
    expect(ORDER_HELP_REASONS.map((r) => r.value).sort()).toEqual(
      ["damaged", "not_received", "other", "shipping", "wrong_item"].sort(),
    );
  });
});
