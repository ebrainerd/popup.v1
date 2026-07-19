import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeStripeCheckoutTab,
  navigateStripeCheckout,
  openCheckoutTab,
} from "@/lib/open-stripe-checkout";

describe("openCheckoutTab", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens a blank tab without noopener features and clears opener", () => {
    const tab = { opener: {} as Window };
    const open = vi.fn().mockReturnValue(tab);
    vi.stubGlobal("window", { open });
    expect(openCheckoutTab()).toBe(tab);
    expect(open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(tab.opener).toBeNull();
  });
});

describe("navigateStripeCheckout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("navigates the pre-opened tab when available", () => {
    const tab = { closed: false, location: { href: "" } } as Window;
    expect(navigateStripeCheckout(tab, "https://checkout.stripe.com/session")).toBe(true);
    expect(tab.location.href).toBe("https://checkout.stripe.com/session");
  });

  it("falls back to same-tab navigation when tab is null", () => {
    const location = { href: "" };
    vi.stubGlobal("window", { location });
    expect(navigateStripeCheckout(null, "https://checkout.stripe.com/session")).toBe(false);
    expect(location.href).toBe("https://checkout.stripe.com/session");
  });

  it("falls back when the pre-opened tab was blocked or closed", () => {
    const location = { href: "" };
    vi.stubGlobal("window", { location });
    const tab = { closed: true, location: { href: "" } } as Window;
    expect(navigateStripeCheckout(tab, "https://checkout.stripe.com/session")).toBe(false);
    expect(location.href).toBe("https://checkout.stripe.com/session");
  });
});

describe("closeStripeCheckoutTab", () => {
  it("closes an open tab", () => {
    const close = vi.fn();
    const tab = { close } as unknown as Window;
    closeStripeCheckoutTab(tab);
    expect(close).toHaveBeenCalledOnce();
  });

  it("no-ops when tab is null", () => {
    expect(() => closeStripeCheckoutTab(null)).not.toThrow();
  });
});
