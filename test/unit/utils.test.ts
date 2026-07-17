import { describe, it, expect } from "vitest";
import { formatCurrency, toCents, deriveShopStatus, derivePublishedShopWindow, isPublishedShopEnded, formatDurationMs } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats integer cents as USD", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(999)).toBe("$9.99");
    expect(formatCurrency(123456)).toBe("$1,234.56");
  });
});

describe("toCents", () => {
  it("converts dollar amounts to integer cents", () => {
    expect(toCents("9.99")).toBe(999);
    expect(toCents(10)).toBe(1000);
    expect(toCents("0")).toBe(0);
  });

  it("rounds to the nearest cent", () => {
    expect(toCents("9.999")).toBe(1000);
    expect(toCents("0.005")).toBe(1); // banker-free rounding via Math.round
  });

  it("returns 0 for non-numeric input", () => {
    expect(toCents("abc")).toBe(0);
    expect(toCents("")).toBe(0);
  });
});

describe("deriveShopStatus", () => {
  const start = new Date("2026-06-20T12:00:00Z");
  const end = new Date("2026-06-20T14:00:00Z");

  it("is scheduled before start", () => {
    expect(deriveShopStatus(start, end, new Date("2026-06-20T11:59:00Z"))).toBe("scheduled");
  });

  it("is open between start and end", () => {
    expect(deriveShopStatus(start, end, new Date("2026-06-20T13:00:00Z"))).toBe("open");
  });

  it("is open exactly at start", () => {
    expect(deriveShopStatus(start, end, start)).toBe("open");
  });

  it("is ended at/after end", () => {
    expect(deriveShopStatus(start, end, end)).toBe("ended");
    expect(deriveShopStatus(start, end, new Date("2026-06-20T15:00:00Z"))).toBe("ended");
  });

  it("accepts ISO strings", () => {
    expect(
      deriveShopStatus(start.toISOString(), end.toISOString(), new Date("2026-06-20T13:00:00Z")),
    ).toBe("open");
  });
});

describe("derivePublishedShopWindow", () => {
  const start = "2026-06-20T12:00:00Z";
  const end = "2026-06-20T14:00:00Z";
  const during = new Date("2026-06-20T13:00:00Z");

  it("keeps drafts closed even inside the scheduled window", () => {
    const w = derivePublishedShopWindow({ status: "draft", start_at: start, end_at: end }, during);
    expect(w.schedule).toBe("open");
    expect(w.isDraft).toBe(true);
    expect(w.isOpen).toBe(false);
  });

  it("opens published shops during the window", () => {
    const w = derivePublishedShopWindow(
      { status: "scheduled", start_at: start, end_at: end },
      during,
    );
    expect(w.isOpen).toBe(true);
    expect(w.isDraft).toBe(false);
  });
});

describe("isPublishedShopEnded", () => {
  const start = "2026-06-20T12:00:00Z";
  const end = "2026-06-20T14:00:00Z";
  const after = new Date("2026-06-20T15:00:00Z");
  const during = new Date("2026-06-20T13:00:00Z");

  it("is false for drafts even when the schedule has ended", () => {
    expect(
      isPublishedShopEnded({ status: "draft", start_at: start, end_at: end }, after),
    ).toBe(false);
  });

  it("is true for published shops after the window", () => {
    expect(
      isPublishedShopEnded({ status: "open", start_at: start, end_at: end }, after),
    ).toBe(true);
  });

  it("is false while the shop is open", () => {
    expect(
      isPublishedShopEnded({ status: "open", start_at: start, end_at: end }, during),
    ).toBe(false);
  });
});

describe("formatDurationMs", () => {
  it("formats hours and minutes", () => {
    expect(formatDurationMs(2 * 60 * 60_000 + 14 * 60_000)).toBe("2h 14m");
  });

  it("formats days", () => {
    expect(formatDurationMs(3 * 24 * 60 * 60_000 + 5 * 60 * 60_000)).toBe("3d 5h");
  });

  it("never returns negative durations", () => {
    expect(formatDurationMs(-1000)).toBe("0m");
  });
});
