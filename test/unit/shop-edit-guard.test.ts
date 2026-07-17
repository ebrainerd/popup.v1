import { describe, it, expect } from "vitest";
import {
  endedShopEditError,
  SHOP_ENDED_EDIT_MESSAGE,
} from "@/lib/shop-edit-guard";

describe("endedShopEditError", () => {
  const start = "2026-06-20T12:00:00Z";
  const end = "2026-06-20T14:00:00Z";
  const after = new Date("2026-06-20T15:00:00Z");
  const during = new Date("2026-06-20T13:00:00Z");

  it("returns null for editable shops", () => {
    expect(
      endedShopEditError({ status: "open", start_at: start, end_at: end }, during),
    ).toBeNull();
    expect(
      endedShopEditError({ status: "draft", start_at: start, end_at: end }, after),
    ).toBeNull();
  });

  it("returns the ended message for published shops past their window", () => {
    expect(
      endedShopEditError({ status: "ended", start_at: start, end_at: end }, after),
    ).toBe(SHOP_ENDED_EDIT_MESSAGE);
  });
});
