/**
 * Client-side Sentry noise filters. Kept pure so unit tests can cover the
 * Event-as-promise-rejection pattern LiveKit/WebRTC produces on flaky mobile
 * websockets (Snapchat / in-app browsers, backgrounded tabs, etc.).
 */

/** True when the rejection reason is a DOM Event (or Event-like), not an Error. */
export function isDomEventRejection(reason: unknown): boolean {
  if (typeof Event !== "undefined" && reason instanceof Event) return true;
  if (!reason || typeof reason !== "object") return false;
  const r = reason as { type?: unknown; message?: unknown; stack?: unknown };
  // Duck-typed Event: has type, no Error stack/message payload worth reporting.
  return typeof r.type === "string" && r.stack === undefined && r.message === undefined;
}

/** True for Sentry's synthesized "Event `Event` (type=error) captured…" message. */
export function isEventCapturedAsPromiseRejectionMessage(message: string | undefined): boolean {
  if (!message) return false;
  return (
    /captured as promise rejection/i.test(message) &&
    (/^Event\b/i.test(message) || /`Event`/i.test(message) || /\(type=error\)/i.test(message))
  );
}

type SentryExceptionLike = {
  type?: string;
  value?: string;
};

type SentryEventLike = {
  exception?: { values?: SentryExceptionLike[] };
};

/** Drop known non-actionable client noise before it hits Sentry. */
export function shouldDropClientSentryEvent(
  event: SentryEventLike,
  originalException?: unknown,
): boolean {
  if (isDomEventRejection(originalException)) return true;
  const values = event.exception?.values ?? [];
  for (const v of values) {
    if (v.type === "Event" && isEventCapturedAsPromiseRejectionMessage(v.value)) {
      return true;
    }
    if (isEventCapturedAsPromiseRejectionMessage(v.value)) return true;
  }
  return false;
}
