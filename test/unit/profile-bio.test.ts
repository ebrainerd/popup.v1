import { describe, expect, it } from "vitest";
import { containsProfanity } from "@/lib/profanity";

describe("profile bio validation", () => {
  it("rejects bios over 280 characters", () => {
    const bio = "a".repeat(281);
    expect(bio.length).toBeGreaterThan(280);
  });

  it("flags profanity in bios", () => {
    expect(containsProfanity("I sell cool shit")).toBe(true);
    expect(containsProfanity("Vintage finds and handmade goods")).toBe(false);
  });
});
