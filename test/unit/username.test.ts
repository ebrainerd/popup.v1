import { describe, expect, it } from "vitest";
import { normalizeUsernameInput, validateUsername } from "@/lib/username";

describe("validateUsername", () => {
  it("accepts a valid handle", () => {
    expect(validateUsername("elliot")).toEqual({ ok: true, username: "elliot" });
    expect(validateUsername("pop_up_1")).toEqual({ ok: true, username: "pop_up_1" });
  });

  it("normalizes to lowercase", () => {
    expect(validateUsername("Elliot")).toEqual({ ok: true, username: "elliot" });
  });

  it("rejects reserved names", () => {
    expect(validateUsername("admin").ok).toBe(false);
    expect(validateUsername("support").ok).toBe(false);
    expect(validateUsername("popup").ok).toBe(false);
  });

  it("rejects invalid patterns", () => {
    expect(validateUsername("ab").ok).toBe(false);
    expect(validateUsername("1bad").ok).toBe(false);
    expect(validateUsername("bad_").ok).toBe(false);
    expect(validateUsername("a__b").ok).toBe(false);
    expect(validateUsername("has space").ok).toBe(false);
  });
});

describe("normalizeUsernameInput", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsernameInput("  Elliot  ")).toBe("elliot");
  });
});
