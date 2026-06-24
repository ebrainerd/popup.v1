import { describe, expect, it, afterEach } from "vitest";
import {
  isEmailReminderDeliveryConfigured,
  isPushReminderDeliveryConfigured,
  isReminderDeliveryConfigured,
} from "@/lib/reminder-delivery";

describe("reminder delivery configuration", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("treats sandbox Resend sender as not configured for buyers", () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM = "PopUp <onboarding@resend.dev>";
    expect(isEmailReminderDeliveryConfigured()).toBe(false);
    expect(isReminderDeliveryConfigured()).toBe(false);
  });

  it("detects verified email sender", () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM = "PopUp <orders@example.com>";
    expect(isEmailReminderDeliveryConfigured()).toBe(true);
  });

  it("detects push when VAPID keys exist", () => {
    delete process.env.RESEND_API_KEY;
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    expect(isPushReminderDeliveryConfigured()).toBe(true);
    expect(isReminderDeliveryConfigured()).toBe(true);
  });
});
