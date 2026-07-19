import { describe, expect, it } from "vitest";
import { buildSellerShareCaptions } from "@/lib/share-captions";

describe("buildSellerShareCaptions", () => {
  it("formats the open time in the shop schedule timezone", () => {
    const iso = "2026-07-19T17:00:00.000Z"; // 10:00am PDT
    const captions = buildSellerShareCaptions(
      "Ember Drop",
      "seller",
      iso,
      "America/Los_Angeles",
    );
    expect(captions[0].text).toMatch(/10:00 AM/);
    expect(captions[0].text).toMatch(/PDT|GMT-7|UTC-7/);
    expect(captions[0].text).not.toMatch(/[\u00a0\u202f\u2009]/);
  });
});
