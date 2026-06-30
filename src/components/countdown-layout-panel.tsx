"use client";

/**
 * Drop Clock scheduled/open below-fold panel — announcements pre-open, chat when open.
 * Keep section order in sync with shop-page-view.tsx countdown branch (§5.3).
 */
import type { ShopWithDetails } from "@/lib/shops";
import { useShopPhase } from "@/hooks/use-shop-open";
import { BroadcastChatPanel } from "@/components/broadcast-chat-panel";
import { ShopAnnouncements } from "@/components/shop-announcements";
import { ShopChat } from "@/components/shop-chat";

type Announcement = Awaited<
  ReturnType<typeof import("@/lib/shops").getShopAnnouncements>
>[number];
type ChatMessage = Awaited<ReturnType<typeof import("@/lib/shops").getChatMessages>>[number];

export function CountdownLayoutPanel({
  shop,
  isOpen,
  isScheduled,
  isDraftPreview,
  isOwner,
  showChat,
  initialMessages,
  announcements,
}: {
  shop: ShopWithDetails;
  isOpen: boolean;
  isScheduled: boolean;
  isDraftPreview: boolean;
  isOwner: boolean;
  showChat: boolean;
  initialMessages: ChatMessage[];
  announcements: Announcement[];
}) {
  const phase = useShopPhase(shop.start_at, shop.end_at, { isOpen, isScheduled });
  const effectiveScheduled = isDraftPreview || phase.isScheduled;
  const effectiveOpen = !isDraftPreview && phase.isOpen;

  if (effectiveScheduled) {
    return (
      <BroadcastChatPanel isScheduled>
        <ShopAnnouncements
          shopId={shop.id}
          initialAnnouncements={announcements}
          isOwner={isOwner}
          isScheduled
          className="min-h-[16rem]"
        />
      </BroadcastChatPanel>
    );
  }

  if (!showChat || !effectiveOpen) return null;

  return (
    <BroadcastChatPanel isScheduled={false}>
      <ShopChat
        initialMessages={initialMessages}
        isOpen={effectiveOpen}
        startAt={shop.start_at}
        endAt={shop.end_at}
        className="min-h-[16rem]"
      />
    </BroadcastChatPanel>
  );
}
