import type { OrderHelpReason, OrderHelpRequest } from "@/lib/database.types";

export const ORDER_MESSAGE_MAX_LENGTH = 2000;

/** Per-user per-order message rate limit: 10 messages per 10 minutes. */
export const ORDER_MESSAGE_RATE_LIMIT_WINDOW_MS = 10 * 60_000;
export const ORDER_MESSAGE_RATE_LIMIT_MAX = 10;

export const ORDER_HELP_REASONS: { value: OrderHelpReason; label: string }[] = [
  { value: "shipping", label: "Shipping question" },
  { value: "wrong_item", label: "Wrong item" },
  { value: "damaged", label: "Arrived damaged" },
  { value: "not_received", label: "Never arrived" },
  { value: "other", label: "Something else" },
];

export function orderHelpReasonLabel(reason: OrderHelpReason): string {
  return ORDER_HELP_REASONS.find((r) => r.value === reason)?.label ?? "Something else";
}

/** True when the user is a party to the order (buyer or shop seller). */
export function isOrderParty(
  userId: string,
  buyerId: string,
  sellerId: string | null | undefined,
): boolean {
  return userId === buyerId || (!!sellerId && userId === sellerId);
}

/**
 * A conversation is archived only when BOTH parties (buyer and seller) have a
 * resolution row. Resolutions from anyone else (defensive) are ignored.
 */
export function isConversationArchived(
  resolvedUserIds: string[],
  buyerId: string,
  sellerId: string | null | undefined,
): boolean {
  if (!sellerId) return false;
  const resolved = new Set(resolvedUserIds);
  return resolved.has(buyerId) && resolved.has(sellerId);
}

/** Escalation is a second step: only an open, not-yet-escalated request can escalate. */
export function canEscalateHelpRequest(
  help: Pick<OrderHelpRequest, "status" | "escalated_at"> | null | undefined,
): boolean {
  return !!help && help.status === "open" && !help.escalated_at;
}
