import Image from "next/image";
import Link from "next/link";
import { Star, Package } from "lucide-react";
import type { StreamProvider } from "@/lib/database.types";
import type { ShopWithDetails } from "@/lib/shops";
type AuctionPanelState = Awaited<ReturnType<typeof import("@/lib/auctions").getLiveAuctionPanelState>>;
type AuctionProductStates = Awaited<ReturnType<typeof import("@/lib/auctions").getAuctionProductStates>>;
import type { ChatSender } from "@/lib/realtime";
import type { LiveEmbed as LiveEmbedInfo } from "@/lib/embeds";
import { parseShopTheme, type ShopTheme } from "@/lib/shop-theme";
import { Countdown } from "@/components/countdown";
import { FollowButton } from "@/components/follow-button";
import { RemindMeButton } from "@/components/remind-me-button";
import { ShareDropCard } from "@/components/share-drop-card";
import { WaitingRoomBanner } from "@/components/waiting-room-banner";
import { ShopAnnouncements } from "@/components/shop-announcements";
import { ExternalLiveNotice } from "@/components/external-live-notice";
import { OpeningReminderTrigger } from "@/components/opening-reminder-trigger";
import { AuctionAutoQueueTrigger } from "@/components/auction-auto-queue-trigger";
import { ReleaseHoldOnCancel } from "@/components/release-hold-on-cancel";
import { ShopRoom } from "@/components/shop-room";
import { StreamSlot } from "@/components/stream-slot";
import { ViewerCount } from "@/components/viewer-count";
import { LiveStreamBadge } from "@/components/live-stream-badge";
import { BroadcastChatPanel } from "@/components/broadcast-chat-panel";
import { ShopChat } from "@/components/shop-chat";
import { ProductsGridLive } from "@/components/products-grid-live";
import { CountdownLayoutPanel } from "@/components/countdown-layout-panel";
import { FlashControls } from "@/components/flash-controls";
import { AuctionControls } from "@/components/auction-controls";
import { AuctionLivePanel } from "@/components/auction-live-panel";
import { DraftPreviewBanner } from "@/components/draft-preview-banner";
import { OwnerShopLiveBar } from "@/components/owner-shop-live-bar";
import { OwnerSellingTools } from "@/components/owner-selling-tools";
import { effectiveStreamProvider } from "@/lib/live-stream";
import { cn } from "@/lib/utils";

type Announcement = Awaited<
  ReturnType<typeof import("@/lib/shops").getShopAnnouncements>
>[number];
type ChatMessage = Awaited<ReturnType<typeof import("@/lib/shops").getChatMessages>>[number];
type AuctionRun = Awaited<ReturnType<typeof import("@/lib/auctions").getShopAuctionRuns>>[number];

export function ShopPageView({
  shop,
  theme: rawTheme,
  isOpen,
  isScheduled,
  isDraftPreview,
  draftPreviewScheduleLabel,
  isOwner,
  seller,
  profileId,
  isFollowing,
  hasReminder,
  reminderCount,
  reminderDeliveryConfigured,
  embed,
  streamProvider,
  nativeLiveEnabled,
  hasLiveReminder,
  liveReminderCount,
  initialMessages,
  announcements,
  auctionRuns,
  auctionPanel,
  auctionProductStates,
  currentUser,
  checkoutCanceled,
}: {
  shop: ShopWithDetails;
  theme: unknown;
  isOpen: boolean;
  isScheduled: boolean;
  isDraftPreview: boolean;
  draftPreviewScheduleLabel: string;
  isOwner: boolean;
  seller: ShopWithDetails["seller"];
  profileId?: string;
  isFollowing: boolean;
  hasReminder: boolean;
  reminderCount: number;
  reminderDeliveryConfigured: boolean;
  embed: LiveEmbedInfo | null;
  streamProvider: StreamProvider;
  nativeLiveEnabled: boolean;
  hasLiveReminder: boolean;
  liveReminderCount: number;
  initialMessages: ChatMessage[];
  announcements: Announcement[];
  auctionRuns: AuctionRun[];
  auctionPanel: AuctionPanelState;
  auctionProductStates: AuctionProductStates;
  currentUser: ChatSender | null;
  checkoutCanceled: boolean;
}) {
  const theme = parseShopTheme(rawTheme);
  const layout = theme.layout;
  const isNativeStream =
    nativeLiveEnabled &&
    effectiveStreamProvider({
      stream_provider: streamProvider,
      live_url: shop.live_url,
      twitch_url: shop.twitch_url,
    }) === "native";
  const allSoldOut =
    isOpen && shop.products.length > 0 && shop.products.every((p) => p.quantity === 0);
  const isBroadcast = layout === "broadcast";
  const isCatalog = layout === "catalog";
  const isCountdown = layout === "countdown";
  const chatBelowProducts = isBroadcast || isCatalog;

  const streamRow = (
    <StreamChatRow
      shop={shop}
      theme={theme}
      layout={layout}
      isOpen={isOpen}
      isScheduled={isScheduled}
      isOwner={isOwner}
      isDraftPreview={isDraftPreview}
      streamProvider={streamProvider}
      nativeEnabled={nativeLiveEnabled}
      needsTosAcceptance={!shop.native_live_tos_accepted_at}
      embed={embed}
      profileId={profileId}
      hasLiveReminder={hasLiveReminder}
      liveReminderCount={liveReminderCount}
      initialMessages={initialMessages}
      announcements={announcements}
      chatPlacement={chatBelowProducts ? "below" : "sidebar"}
      streamPlacement={isCatalog ? "secondary" : "primary"}
    />
  );

  const shopHeader = (
    <ShopHeader
      shop={shop}
      theme={theme}
      seller={seller}
      isOpen={isOpen}
      isScheduled={isScheduled}
      isOwner={isOwner}
      isFollowing={isFollowing}
      hasReminder={hasReminder}
      reminderCount={reminderCount}
      reminderDeliveryConfigured={reminderDeliveryConfigured}
      profileId={profileId}
      layout={layout}
      isDraftPreview={isDraftPreview}
      initialIsLive={shop.is_live}
    />
  );

  const ownerLiveBar =
    isOwner && isOpen && !isDraftPreview && !isNativeStream ? (
      <OwnerShopLiveBar
        shopId={shop.id}
        isLive={shop.is_live}
        isOpen={isOpen}
        isEnded={false}
        streamProvider={streamProvider}
        liveUrl={shop.live_url}
        twitchUrl={shop.twitch_url}
        nativeEnabled={nativeLiveEnabled}
        needsTosAcceptance={!shop.native_live_tos_accepted_at}
      />
    ) : null;

  const shareDropCard =
    isOwner && isScheduled && seller && layout !== "countdown" && !isDraftPreview ? (
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <ShareDropCard
          shopId={shop.id}
          shopName={shop.name}
          sellerHandle={seller.username}
          startAt={shop.start_at}
        />
      </div>
    ) : null;

  const soldOutBanner =
    allSoldOut && !isOwner && seller ? (
      <div className="mb-8 rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center">
        <p className="font-medium">Sold out!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Follow @{seller.username} and set a reminder for their next drop.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <FollowButton
            sellerId={seller.id}
            initialFollowing={isFollowing}
            isAuthed={Boolean(profileId)}
          />
        </div>
      </div>
    ) : null;

  const externalLiveNotice =
    embed && !embed.embeddable ? (
      <ExternalLiveNotice embed={embed} initialIsLive={isOpen && shop.is_live} />
    ) : null;

  const ownerSellingTools =
    isOwner && isOpen ? (
      <OwnerSellingTools>
        <AuctionControls shopId={shop.id} products={shop.products} runs={auctionRuns} />
        <FlashControls products={shop.products} />
      </OwnerSellingTools>
    ) : null;

  const auctionPanelSection = (
    <AuctionLivePanel
      shopId={shop.id}
      initial={auctionPanel}
      isAuthed={Boolean(profileId)}
      isOwner={isOwner}
      userId={profileId ?? null}
    />
  );

  const mainContent = (
    <MainContent
      shop={shop}
      theme={theme}
      isOpen={isOpen}
      isScheduled={isScheduled}
      profileId={profileId}
      isOwner={isOwner}
      auctionProductStates={auctionProductStates}
    />
  );

  const chatBelowProductsSection =
    chatBelowProducts && theme.showChat ? (
      <BroadcastChatBelow
        shop={shop}
        isOpen={isOpen}
        isScheduled={isScheduled}
        isOwner={isOwner}
        initialMessages={initialMessages}
        announcements={announcements}
      />
    ) : null;

  const catalogReminderFooter =
    isCatalog && isScheduled && !isOwner && theme.showReminderCta && seller ? (
      <CatalogReminderFooter
        shop={shop}
        seller={seller}
        profileId={profileId}
        isFollowing={isFollowing}
        hasReminder={hasReminder}
        reminderCount={reminderCount}
        reminderDeliveryConfigured={reminderDeliveryConfigured}
      />
    ) : null;

  const countdownReminderFooter =
    isCountdown && isScheduled && !isOwner && theme.showReminderCta && seller ? (
      <CountdownReminderFooter
        shop={shop}
        seller={seller}
        profileId={profileId}
        isFollowing={isFollowing}
        hasReminder={hasReminder}
        reminderCount={reminderCount}
        reminderDeliveryConfigured={reminderDeliveryConfigured}
      />
    ) : null;

  const countdownLayoutPanel = isCountdown ? (
    <CountdownLayoutPanel
      shop={shop}
      isOpen={isOpen}
      isScheduled={isScheduled}
      isDraftPreview={isDraftPreview}
      isOwner={isOwner}
      showChat={theme.showChat}
      initialMessages={initialMessages}
      announcements={announcements}
    />
  ) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {checkoutCanceled && <ReleaseHoldOnCancel shopId={shop.id} />}

      {isDraftPreview && (
        <DraftPreviewBanner shopId={shop.id} scheduleLabel={draftPreviewScheduleLabel} />
      )}

      {isScheduled && !isDraftPreview && !isCountdown && (
        <WaitingRoomBanner startAt={shop.start_at} hasReminder={hasReminder} />
      )}

      <ShopRoom shopId={shop.id} currentUser={currentUser} isOwner={isOwner}>
        <OpeningReminderTrigger
          shopId={shop.id}
          startAt={shop.start_at}
          endAt={shop.end_at}
          initiallyOpen={isOpen}
        />
        <AuctionAutoQueueTrigger
          shopId={shop.id}
          startAt={shop.start_at}
          endAt={shop.end_at}
          initiallyOpen={isOpen}
        />

        {isBroadcast ? (
          <>
            {/* Live Stage §5.1: header → stream hero → auction → products → chat */}
            {shopHeader}
            {streamRow}
            {ownerLiveBar}
            {shareDropCard}
            {soldOutBanner}
            {externalLiveNotice}
            {ownerSellingTools}
            {auctionPanelSection}
            {mainContent}
            {chatBelowProductsSection}
          </>
        ) : isCatalog ? (
          <>
            {/* Lookbook §5.2: header → products → stream band → reminders → chat */}
            {shopHeader}
            {shareDropCard}
            {soldOutBanner}
            {externalLiveNotice}
            {ownerSellingTools}
            {auctionPanelSection}
            {mainContent}
            {ownerLiveBar}
            {streamRow}
            {catalogReminderFooter}
            {chatBelowProductsSection}
          </>
        ) : isCountdown ? (
          <>
            {/* Drop Clock §5.3: header → hero countdown → reminders → products → announcements/chat */}
            {shopHeader}
            {streamRow}
            {countdownReminderFooter}
            {shareDropCard}
            {soldOutBanner}
            {externalLiveNotice}
            {ownerSellingTools}
            {auctionPanelSection}
            {mainContent}
            {ownerLiveBar}
            {countdownLayoutPanel}
          </>
        ) : (
          <>
            {/* The Room §5.4: header (seller bio) → stream + chat sidebar → auction → products */}
            {shopHeader}
            {streamRow}
            {ownerLiveBar}
            {shareDropCard}
            {soldOutBanner}
            {externalLiveNotice}
            {ownerSellingTools}
            {auctionPanelSection}
            {mainContent}
          </>
        )}
      </ShopRoom>
    </div>
  );
}

function ShopHeader({
  shop,
  theme,
  seller,
  isOpen,
  isScheduled,
  isOwner,
  isFollowing,
  hasReminder,
  reminderCount,
  reminderDeliveryConfigured,
  profileId,
  layout,
  isDraftPreview,
  initialIsLive = false,
}: {
  shop: ShopWithDetails;
  theme: ShopTheme;
  seller: ShopWithDetails["seller"];
  isOpen: boolean;
  isScheduled: boolean;
  isOwner: boolean;
  isFollowing: boolean;
  hasReminder: boolean;
  reminderCount: number;
  reminderDeliveryConfigured: boolean;
  profileId?: string;
  layout: ShopTheme["layout"];
  isDraftPreview: boolean;
  initialIsLive?: boolean;
}) {
  const compact = layout === "broadcast" || layout === "countdown" || layout === "catalog";
  const remindersInHeader =
    !(layout === "catalog" && isScheduled) && !(layout === "countdown" && isScheduled);
  const titleInHeader = !(layout === "countdown" && isScheduled);

  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        compact && "mb-4",
      )}
    >
      <div className="space-y-2">
        {titleInHeader && (
          <h1
            className={cn(
              "font-extrabold tracking-tight text-foreground",
              layout === "countdown" ? "text-2xl" : "text-3xl",
            )}
          >
            {shop.name}
          </h1>
        )}
        {theme.showSellerBio && seller && (
          <Link
            href={`/u/${seller.username}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {seller.avatar_url ? (
              <Image
                src={seller.avatar_url}
                alt={seller.username}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                {seller.username.charAt(0).toUpperCase()}
              </span>
            )}
            <span>@{seller.username}</span>
            {seller.rating_count > 0 && (
              <span className="flex items-center gap-1">
                <Star className="size-3.5 fill-current text-primary" />
                {Number(seller.rating_avg ?? 0).toFixed(1)} ({seller.rating_count})
              </span>
            )}
          </Link>
        )}
        {theme.showSellerBio && shop.description && (
          <p className="max-w-2xl text-pretty text-muted-foreground">{shop.description}</p>
        )}
      </div>

      <div className="flex flex-col items-start gap-3 sm:items-end">
        <div className="flex flex-wrap items-center gap-2">
          {layout === "broadcast" && isOpen && (
            <LiveStreamBadge initialIsLive={initialIsLive} />
          )}
          {isOpen && <ViewerCount />}
          {layout !== "countdown" && isOpen && (
            <Countdown startAt={shop.start_at} endAt={shop.end_at} draft={isDraftPreview} />
          )}
        </div>
        {remindersInHeader && isScheduled && !isOwner && theme.showReminderCta && (
          <div className="flex flex-wrap items-center gap-2">
            <RemindMeButton
              shopId={shop.id}
              initialSubscribed={hasReminder}
              isAuthed={Boolean(profileId)}
              reminderCount={reminderCount}
              deliveryConfigured={reminderDeliveryConfigured}
            />
            {seller && (
              <FollowButton
                sellerId={seller.id}
                initialFollowing={isFollowing}
                isAuthed={Boolean(profileId)}
              />
            )}
          </div>
        )}
        {isOpen && seller && !isOwner && (
          <FollowButton
            sellerId={seller.id}
            initialFollowing={isFollowing}
            isAuthed={Boolean(profileId)}
          />
        )}
        {isOwner && (
        <Link
          href={`/dashboard/shops/${shop.id}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {isDraftPreview ? "Back to manage shop →" : "Manage this shop →"}
        </Link>
        )}
      </div>
    </div>
  );
}

function StreamChatRow({
  shop,
  theme,
  layout,
  isOpen,
  isScheduled,
  isOwner,
  isDraftPreview,
  streamProvider,
  nativeEnabled,
  needsTosAcceptance,
  embed,
  profileId,
  hasLiveReminder,
  liveReminderCount,
  initialMessages,
  announcements,
  chatPlacement = "sidebar",
  streamPlacement = "primary",
}: {
  shop: ShopWithDetails;
  theme: ShopTheme;
  layout: ShopTheme["layout"];
  isOpen: boolean;
  isScheduled: boolean;
  isOwner: boolean;
  isDraftPreview: boolean;
  streamProvider: StreamProvider;
  nativeEnabled: boolean;
  needsTosAcceptance: boolean;
  embed: LiveEmbedInfo | null;
  profileId?: string;
  hasLiveReminder: boolean;
  liveReminderCount: number;
  initialMessages: ChatMessage[];
  announcements: Announcement[];
  chatPlacement?: "sidebar" | "below";
  streamPlacement?: "primary" | "secondary";
}) {
  const chatFillClass = "h-full min-h-[16rem] lg:min-h-0";
  const showSidebarChat = chatPlacement === "sidebar" && layout !== "countdown";

  const chatPanel =
    showSidebarChat &&
    theme.showChat &&
    (isScheduled ? (
      <ShopAnnouncements
        shopId={shop.id}
        initialAnnouncements={announcements}
        isOwner={isOwner}
        isScheduled
        className={chatFillClass}
      />
    ) : (
      <ShopChat
        initialMessages={initialMessages}
        isOpen={isOpen}
        startAt={shop.start_at}
        endAt={shop.end_at}
        className={chatFillClass}
      />
    ));

  return (
    <div
      className={cn(
        "mb-6 grid gap-4",
        // The Room §5.4: on desktop the stream window and the chat sidebar share
        // one constant row height, so they always end at exactly the same line.
        chatPanel && "lg:h-[28rem] lg:grid-cols-[minmax(0,1fr)_340px] lg:items-stretch",
      )}
    >
      <StreamSlot
        shop={shop}
        layout={layout}
        isOpen={isOpen}
        isScheduled={isScheduled}
        isOwner={isOwner}
        isDraftPreview={isDraftPreview}
        initialIsLive={shop.is_live}
        streamProvider={streamProvider}
        nativeEnabled={nativeEnabled}
        needsTosAcceptance={needsTosAcceptance}
        embed={embed}
        profileId={profileId}
        hasLiveReminder={hasLiveReminder}
        liveReminderCount={liveReminderCount}
        streamPlacement={streamPlacement}
        fillHeight={Boolean(chatPanel)}
        className="h-full"
      />
      {chatPanel && <aside className="flex min-h-0 flex-col">{chatPanel}</aside>}
    </div>
  );
}

function MainContent({
  shop,
  theme,
  isOpen,
  isScheduled,
  profileId,
  isOwner,
  auctionProductStates,
}: {
  shop: ShopWithDetails;
  theme: ShopTheme;
  isOpen: boolean;
  isScheduled: boolean;
  profileId?: string;
  isOwner: boolean;
  auctionProductStates: AuctionProductStates;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground">
        <Package className="size-5" />
        {isScheduled ? "Product preview" : "Products"}
      </h2>
      <ProductsGridLive
        shopId={shop.id}
        initialProducts={shop.products}
        isOpen={isOpen}
        isAuthed={Boolean(profileId)}
        isOwner={isOwner}
        userId={profileId ?? null}
        initialAuctionsByProductId={auctionProductStates}
        startAt={shop.start_at}
        endAt={shop.end_at}
        gridColumns={theme.productGridColumns}
      />
      {isOpen && !isOwner && shop.products.length > 0 && (
        <p className="mt-6 text-pretty text-center text-xs text-muted-foreground">
          Purchases and winning bids are contracts directly with the seller; PopUp is not the seller
          of record. By buying or bidding you agree to PopUp&apos;s{" "}
          <Link
            href="/legal/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Terms of Service
          </Link>
          .
        </p>
      )}
    </section>
  );
}

/** Drop Clock scheduled reminders — below hero countdown. See shop-theme-preview countdown branch. */
function CountdownReminderFooter({
  shop,
  seller,
  profileId,
  isFollowing,
  hasReminder,
  reminderCount,
  reminderDeliveryConfigured,
}: {
  shop: ShopWithDetails;
  seller: NonNullable<ShopWithDetails["seller"]>;
  profileId?: string;
  isFollowing: boolean;
  hasReminder: boolean;
  reminderCount: number;
  reminderDeliveryConfigured: boolean;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
      <RemindMeButton
        shopId={shop.id}
        initialSubscribed={hasReminder}
        isAuthed={Boolean(profileId)}
        reminderCount={reminderCount}
        deliveryConfigured={reminderDeliveryConfigured}
      />
      <FollowButton
        sellerId={seller.id}
        initialFollowing={isFollowing}
        isAuthed={Boolean(profileId)}
      />
    </div>
  );
}

/** Lookbook scheduled reminders — below slim countdown footer. See shop-theme-preview catalog branch. */
function CatalogReminderFooter({
  shop,
  seller,
  profileId,
  isFollowing,
  hasReminder,
  reminderCount,
  reminderDeliveryConfigured,
}: {
  shop: ShopWithDetails;
  seller: NonNullable<ShopWithDetails["seller"]>;
  profileId?: string;
  isFollowing: boolean;
  hasReminder: boolean;
  reminderCount: number;
  reminderDeliveryConfigured: boolean;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
      <RemindMeButton
        shopId={shop.id}
        initialSubscribed={hasReminder}
        isAuthed={Boolean(profileId)}
        reminderCount={reminderCount}
        deliveryConfigured={reminderDeliveryConfigured}
      />
      <FollowButton
        sellerId={seller.id}
        initialFollowing={isFollowing}
        isAuthed={Boolean(profileId)}
      />
    </div>
  );
}

/** Live Stage / Lookbook chat — full width below products. See shop-theme-preview broadcast/catalog branches. */
function BroadcastChatBelow({
  shop,
  isOpen,
  isScheduled,
  isOwner,
  initialMessages,
  announcements,
}: {
  shop: ShopWithDetails;
  isOpen: boolean;
  isScheduled: boolean;
  isOwner: boolean;
  initialMessages: ChatMessage[];
  announcements: Announcement[];
}) {
  const chatFillClass = "h-full min-h-[16rem]";

  const panel = isScheduled ? (
    <ShopAnnouncements
      shopId={shop.id}
      initialAnnouncements={announcements}
      isOwner={isOwner}
      isScheduled
      className={chatFillClass}
    />
  ) : (
    <ShopChat
      initialMessages={initialMessages}
      isOpen={isOpen}
      startAt={shop.start_at}
      endAt={shop.end_at}
      className={chatFillClass}
    />
  );

  return (
    <BroadcastChatPanel isScheduled={isScheduled}>
      {panel}
    </BroadcastChatPanel>
  );
}
