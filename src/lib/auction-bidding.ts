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

export const AUCTION_DURATION_PRESETS = [
  { label: "30 sec", seconds: 30 },
  { label: "60 sec", seconds: 60 },
  { label: "2 min", seconds: 120 },
  { label: "5 min", seconds: 300 },
] as const;

export const DEFAULT_AUCTION_DURATION = 60;
export const DEFAULT_MIN_INCREMENT_CENTS = 100;
export const MIN_INCREMENT_CENTS = 50;
export const MIN_BID_CENTS = 50;
export const CHECKOUT_WINDOW_MINUTES = 30;
