import { describe, expect, it } from "vitest";
import {
  computeGrossSalesStats,
  getRangeStartIso,
  getSellerStatsRangeLabel,
  parseSellerStatsRange,
} from "@/lib/seller-stats";

const NOW = new Date("2026-07-09T15:00:00.000Z");

describe("parseSellerStatsRange", () => {
  it("defaults to 30d", () => {
    expect(parseSellerStatsRange(undefined)).toBe("30d");
    expect(parseSellerStatsRange("invalid")).toBe("30d");
  });

  it("accepts known ranges", () => {
    expect(parseSellerStatsRange("7d")).toBe("7d");
    expect(parseSellerStatsRange("month")).toBe("month");
    expect(parseSellerStatsRange("all")).toBe("all");
  });
});

describe("getRangeStartIso", () => {
  it("returns null for all time", () => {
    expect(getRangeStartIso("all", NOW)).toBeNull();
  });

  it("steps back 7 and 30 days", () => {
    expect(getRangeStartIso("7d", NOW)).toBe("2026-07-02T15:00:00.000Z");
    expect(getRangeStartIso("30d", NOW)).toBe("2026-06-09T15:00:00.000Z");
  });

  it("starts at the first day of the current month", () => {
    expect(getRangeStartIso("month", NOW)).toBe("2026-07-01T00:00:00.000Z");
  });
});

describe("computeGrossSalesStats", () => {
  const orders = [
    { amount_paid: 1000, status: "paid", created_at: "2026-07-08T12:00:00.000Z" },
    { amount_paid: 500, status: "shipped", created_at: "2026-06-01T12:00:00.000Z" },
    { amount_paid: 200, status: "refunded", created_at: "2026-07-08T12:00:00.000Z" },
    { amount_paid: 300, status: "canceled", created_at: "2026-07-08T12:00:00.000Z" },
  ];

  it("excludes canceled and refunded orders", () => {
    const stats = computeGrossSalesStats(orders, "all", NOW);
    expect(stats.grossSales).toBe(1500);
    expect(stats.orderCount).toBe(2);
  });

  it("filters by created_at for bounded ranges", () => {
    const stats = computeGrossSalesStats(orders, "7d", NOW);
    expect(stats.grossSales).toBe(1000);
    expect(stats.orderCount).toBe(1);
  });

  it("includes sales from the start of the month", () => {
    const stats = computeGrossSalesStats(orders, "month", NOW);
    expect(stats.grossSales).toBe(1000);
    expect(stats.orderCount).toBe(1);
  });
});

describe("getSellerStatsRangeLabel", () => {
  it("returns human labels for pills and stat cards", () => {
    expect(getSellerStatsRangeLabel("30d")).toBe("30 days");
    expect(getSellerStatsRangeLabel("month")).toBe("This month");
  });
});
