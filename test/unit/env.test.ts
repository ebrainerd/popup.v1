import { describe, it, expect, afterEach } from "vitest";
import { getSiteUrl } from "@/lib/env";

const ORIGINAL = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("getSiteUrl", () => {
  it("returns localhost when unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("passes through a full https URL (trimming trailing slash)", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://popup.app/";
    expect(getSiteUrl()).toBe("https://popup.app");
  });

  it("adds https:// when the scheme is missing (the Vercel misconfig)", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "popup-v1.vercel.app";
    expect(getSiteUrl()).toBe("https://popup-v1.vercel.app");
    // Must be constructable as a URL (metadataBase uses new URL()).
    expect(() => new URL(getSiteUrl())).not.toThrow();
  });

  it("keeps http for local-style values", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});
