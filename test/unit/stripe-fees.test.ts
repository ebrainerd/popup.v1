import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { platformFee, platformFeeBps, releaseDelayHours } from "@/lib/stripe";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("platformFeeBps", () => {
  beforeEach(() => {
    delete process.env.PLATFORM_FEE_BPS;
  });

  it("defaults to 900 bps (9%)", () => {
    expect(platformFeeBps()).toBe(900);
  });

  it("respects a valid override", () => {
    process.env.PLATFORM_FEE_BPS = "1000";
    expect(platformFeeBps()).toBe(1000);
  });

  it("falls back to 900 for invalid/out-of-range values", () => {
    process.env.PLATFORM_FEE_BPS = "-5";
    expect(platformFeeBps()).toBe(900);
    process.env.PLATFORM_FEE_BPS = "20000";
    expect(platformFeeBps()).toBe(900);
    process.env.PLATFORM_FEE_BPS = "nonsense";
    expect(platformFeeBps()).toBe(900);
  });
});

describe("platformFee", () => {
  beforeEach(() => {
    delete process.env.PLATFORM_FEE_BPS;
  });

  it("takes 9% of the gross amount (rounded)", () => {
    expect(platformFee(10000)).toBe(900); // $100 -> $9
    expect(platformFee(2599)).toBe(234); // $25.99 -> 233.91 -> 234
    expect(platformFee(0)).toBe(0);
  });

  it("scales with the configured rate", () => {
    process.env.PLATFORM_FEE_BPS = "0";
    expect(platformFee(10000)).toBe(0);
    process.env.PLATFORM_FEE_BPS = "2500";
    expect(platformFee(10000)).toBe(2500);
  });
});

describe("releaseDelayHours", () => {
  beforeEach(() => {
    delete process.env.RELEASE_DELAY_HOURS;
  });

  it("defaults to 72 hours", () => {
    expect(releaseDelayHours()).toBe(72);
  });

  it("allows 0 for immediate release in testing", () => {
    process.env.RELEASE_DELAY_HOURS = "0";
    expect(releaseDelayHours()).toBe(0);
  });

  it("ignores invalid values", () => {
    process.env.RELEASE_DELAY_HOURS = "-1";
    expect(releaseDelayHours()).toBe(72);
  });
});
