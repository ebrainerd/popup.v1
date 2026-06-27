/**
 * Realtime contract shared between the shop page and seller controls.
 * One Supabase Realtime channel per shop carries presence (viewer count)
 * plus broadcast events for chat and flash drops — "where the magic lives".
 */

export function shopChannel(shopId: string): string {
  return `shop:${shopId}`;
}

export const ROOM_EVENTS = {
  chat: "chat",
  system: "system",
  flashPrice: "flash_price",
  flashClear: "flash_clear",
  flashItem: "flash_item",
  live: "live",
  auctionStarted: "auction_started",
  auctionBid: "auction_bid",
  auctionExtended: "auction_extended",
  auctionEnded: "auction_ended",
  auctionWon: "auction_won",
} as const;

export type RoomEvent = (typeof ROOM_EVENTS)[keyof typeof ROOM_EVENTS];

export type ChatSender = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type ChatBroadcast = {
  id: string;
  message: string;
  created_at: string;
  user: ChatSender;
};

export type SystemBroadcast = {
  text: string;
  kind: "mute" | "unmute" | "info";
  targetUserId?: string;
};

export type FlashPriceBroadcast = {
  productId: string;
  discountPrice: number; // cents
};

export type FlashClearBroadcast = {
  productId: string;
};

export type FlashItemBroadcast = {
  id: string;
  shop_id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  price: number;
  quantity: number;
  discount_price: number | null;
  is_flash_only: boolean;
  flash_expires_at: string | null;
};

export type LiveBroadcast = {
  isLive: boolean;
  liveUrl: string | null;
  streamProvider?: "native" | "youtube" | "twitch";
};

export type AuctionStartedBroadcast = {
  auctionId: string;
  productId: string;
  productTitle: string;
  startingBid: number;
  endsAt: string;
  suddenDeath: boolean;
};

export type AuctionBidBroadcast = {
  auctionId: string;
  productId: string;
  status: string;
  currentBid: number;
  bidCount: number;
  currentWinnerId: string | null;
  currentWinnerName: string | null;
  endsAt: string | null;
  nextMinimumBid: number;
  extended?: boolean;
};

export type AuctionEndedBroadcast = {
  auctionId: string;
  productId: string;
  status: "unsold" | "awaiting_payment" | "paid" | "payment_expired";
  winningBid?: number;
  winnerId?: string;
  winnerName?: string;
  checkoutExpiresAt?: string;
};

export type PresenceMeta = {
  viewer_id: string;
  username: string | null;
  online_at: string;
};
