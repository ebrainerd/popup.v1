import { describe, it, expect } from "vitest";
import { filterProfanity, containsProfanity } from "@/lib/profanity";

describe("profanity filter", () => {
  it("masks blocked words with asterisks of the same length", () => {
    expect(filterProfanity("you shit")).toBe("you ****");
  });

  it("is case-insensitive and matches whole words", () => {
    expect(filterProfanity("SHIT happens")).toBe("**** happens");
  });

  it("does not mask substrings inside clean words", () => {
    // "assistant" contains "ass"-like fragments but should not be masked
    expect(filterProfanity("assistant shipment")).toBe("assistant shipment");
  });

  it("leaves clean messages untouched", () => {
    const clean = "This drop is amazing, grab it now!";
    expect(filterProfanity(clean)).toBe(clean);
    expect(containsProfanity(clean)).toBe(false);
  });

  it("detects profanity", () => {
    expect(containsProfanity("what the fuck")).toBe(true);
    expect(containsProfanity("hello there")).toBe(false);
  });

  it("containsProfanity is stable across repeated calls (global regex lastIndex reset)", () => {
    expect(containsProfanity("shit")).toBe(true);
    expect(containsProfanity("shit")).toBe(true);
  });
});
