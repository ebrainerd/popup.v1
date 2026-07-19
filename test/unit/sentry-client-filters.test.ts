import { describe, expect, it } from "vitest";
import {
  isDomEventRejection,
  isEventCapturedAsPromiseRejectionMessage,
  shouldDropClientSentryEvent,
} from "@/lib/sentry-client-filters";

describe("sentry-client-filters", () => {
  it("detects Sentry's Event-as-promise-rejection message", () => {
    expect(
      isEventCapturedAsPromiseRejectionMessage(
        "Event `Event` (type=error) captured as promise rejection",
      ),
    ).toBe(true);
    expect(isEventCapturedAsPromiseRejectionMessage("TypeError: boom")).toBe(false);
  });

  it("detects DOM Event rejection reasons", () => {
    expect(isDomEventRejection(new Event("error"))).toBe(true);
    expect(isDomEventRejection(new Error("real"))).toBe(false);
    expect(isDomEventRejection({ type: "error" })).toBe(true);
    expect(isDomEventRejection({ type: "error", message: "x", stack: "y" })).toBe(false);
  });

  it("drops Event promise-rejection events via beforeSend helper", () => {
    expect(
      shouldDropClientSentryEvent(
        {
          exception: {
            values: [
              {
                type: "Event",
                value: "Event `Event` (type=error) captured as promise rejection",
              },
            ],
          },
        },
        new Event("error"),
      ),
    ).toBe(true);

    expect(
      shouldDropClientSentryEvent(
        {
          exception: {
            values: [{ type: "TypeError", value: "Cannot read properties of null" }],
          },
        },
        new TypeError("Cannot read properties of null"),
      ),
    ).toBe(false);
  });
});
