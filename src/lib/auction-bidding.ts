/** Pure proxy-bidding helpers — mirrored by Postgres RPCs in 0013_auctions.sql */

export type MaxBid = { bidderId: string; maxAmount: number; createdAt: number };

export function computeVisibleBid(
  startingBid: number,
  minIncrement: number,
  winnerMax: number,
  runnerUpMax: number | null,
): number {
  if (runnerUpMax === null) return startingBid;
  if (runnerUpMax === winnerMax) return startingBid;
  return Math.min(winnerMax, runnerUpMax + minIncrement);
}

export function nextMinimumBid(
  startingBid: number,
  minIncrement: number,
  currentBid: number,
  bidCount: number,
): number {
  if (bidCount === 0) return startingBid;
  return currentBid + minIncrement;
}

/** Resolve leader after a new/updated max bid. Earlier createdAt wins ties. */
export function resolveAuctionLeader(
  startingBid: number,
  minIncrement: number,
  bids: MaxBid[],
): {
  winnerId: string | null;
  winnerMax: number;
  runnerUpMax: number | null;
  visibleBid: number;
} {
  if (bids.length === 0) {
    return { winnerId: null, winnerMax: 0, runnerUpMax: null, visibleBid: startingBid };
  }

  const sorted = [...bids].sort((a, b) => {
    if (b.maxAmount !== a.maxAmount) return b.maxAmount - a.maxAmount;
    return a.createdAt - b.createdAt;
  });

  const winner = sorted[0];
  const runner = sorted[1] ?? null;
  const visibleBid = computeVisibleBid(
    startingBid,
    minIncrement,
    winner.maxAmount,
    runner?.maxAmount ?? null,
  );

  return {
    winnerId: winner.bidderId,
    winnerMax: winner.maxAmount,
    runnerUpMax: runner?.maxAmount ?? null,
    visibleBid,
  };
}

export function shouldExtendAuction(
  endsAtMs: number,
  nowMs: number,
  softCloseSeconds: number,
  suddenDeath: boolean,
): boolean {
  if (suddenDeath) return false;
  const remainingMs = endsAtMs - nowMs;
  return remainingMs > 0 && remainingMs < softCloseSeconds * 1000;
}

export const AUCTION_UNTIL_SHOP_CLOSES_VALUE = "shop" as const;

export type AuctionDurationPreset = {
  label: string;
  seconds: number | null;
  group: "live" | "longer" | "shop";
};

export const AUCTION_DURATION_PRESETS: readonly AuctionDurationPreset[] = [
  { label: "30 sec", seconds: 30, group: "live" },
  { label: "1 min", seconds: 60, group: "live" },
  { label: "2 min", seconds: 120, group: "live" },
  { label: "5 min", seconds: 300, group: "live" },
  { label: "10 min", seconds: 600, group: "live" },
  { label: "15 min", seconds: 900, group: "longer" },
  { label: "30 min", seconds: 1800, group: "longer" },
  { label: "1 hour", seconds: 3600, group: "longer" },
  { label: "2 hours", seconds: 7200, group: "longer" },
  { label: "4 hours", seconds: 14400, group: "longer" },
  { label: "Until shop closes", seconds: null, group: "shop" },
];

export const AUCTION_DURATION_PRESET_GROUPS = [
  { key: "live" as const, label: "Live" },
  { key: "longer" as const, label: "Longer" },
  { key: "shop" as const, label: "Shop" },
];

export const DEFAULT_AUCTION_DURATION = 60;
export const DEFAULT_MIN_INCREMENT_CENTS = 100;
export const MIN_INCREMENT_CENTS = 50;
export const MIN_BID_CENTS = 50;
export const CHECKOUT_WINDOW_MINUTES = 30;

export function isAuctionUntilShopCloses(
  durationSeconds: number | null,
  endsWithShop?: boolean,
): boolean {
  if (endsWithShop === true) return true;
  if (endsWithShop === false) return false;
  return durationSeconds === null;
}

export function auctionDurationToSelectValue(
  endsWithShop: boolean,
  durationSeconds: number,
): string {
  if (endsWithShop) return AUCTION_UNTIL_SHOP_CLOSES_VALUE;
  return String(durationSeconds);
}

export function parseAuctionDurationSelectValue(value: string): {
  endsWithShop: boolean;
  durationSeconds: number;
} {
  if (value === AUCTION_UNTIL_SHOP_CLOSES_VALUE) {
    return { endsWithShop: true, durationSeconds: DEFAULT_AUCTION_DURATION };
  }
  const seconds = Number(value);
  return {
    endsWithShop: false,
    durationSeconds:
      Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_AUCTION_DURATION,
  };
}

export function validateAuctionDurationConfig(
  endsWithShop: boolean | undefined,
  durationSeconds: number | null | undefined,
): { ok: true } | { ok: false; message: string } {
  if (endsWithShop) return { ok: true };
  if (!durationSeconds || durationSeconds < 1) {
    return { ok: false, message: "Choose an auction duration." };
  }
  return { ok: true };
}

export function resolveAuctionDurationForDb(
  isAuction: boolean,
  endsWithShop: boolean | undefined,
  durationSeconds: number | null | undefined,
): { auction_duration_seconds: number | null; auction_ends_with_shop: boolean } {
  if (!isAuction) {
    return { auction_duration_seconds: null, auction_ends_with_shop: false };
  }
  if (endsWithShop) {
    return { auction_duration_seconds: null, auction_ends_with_shop: true };
  }
  return {
    auction_duration_seconds: durationSeconds ?? DEFAULT_AUCTION_DURATION,
    auction_ends_with_shop: false,
  };
}
