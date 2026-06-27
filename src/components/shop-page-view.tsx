import Image from "next/image";
import Link from "next/link";
import { Star, Package } from "lucide-react";
import type { StreamProvider } from "@/lib/database.types";
import type { ShopWithDetails } from "@/lib/shops";
type AuctionPanelState = Awaited<ReturnType<typeof import("@/lib/auctions").getLiveAuctionPanelState>>;
import type { ChatSender } from "@/lib/realtime";
import type { LiveEmbed as LiveEmbedInfo } from "@/lib/embeds";
import { parseShopTheme, type ShopTheme } from "@/lib/shop-theme";
import { Countdown } from "@/components/countdown";
import { FollowButton } from "@/components/follow-button";
import { RemindMeButton } from "@/components/remind-me-button";
import { ShareDropCard } from "@/components/share-drop-card";
import { WaitingRoomBanner } from "@/components/waiting-room-banner";
import { ShopAnnouncements } from "@/components/shop-announcements";
import { LiveEmbed as LiveEmbedPlayer } from "@/components/live-embed";
import { ReleaseHoldOnCancel } from "@/components/release-hold-on-cancel";
import { ShopRoom } from "@/components/shop-room";
import { StreamSlot } from "@/components/stream-slot";
import { ViewerCount } from "@/components/viewer-count";
import { ShopChat } from "@/components/shop-chat";
import { ProductsGridLive } from "@/components/products-grid-live";
import { FlashControls } from "@/components/flash-controls";
import { AuctionControls } from "@/components/auction-controls";
import { AuctionLivePanel } from "@/components/auction-live-panel";
import { DraftPreviewBanner } from "@/components/draft-preview-banner";
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
  currentUser: ChatSender | null;
  checkoutCanceled: boolean;
}) {
  const theme = parseShopTheme(rawTheme);
  const layout = theme.layout;
  const allSoldOut =
    isOpen && shop.products.length > 0 && shop.products.every((p) => p.quantity === 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {checkoutCanceled && <ReleaseHoldOnCancel shopId={shop.id} />}

      {isDraftPreview && (
        <DraftPreviewBanner shopId={shop.id} scheduleLabel={draftPreviewScheduleLabel} />
      )}

      {isScheduled && !isDraftPreview && (
        <WaitingRoomBanner startAt={shop.start_at} hasReminder={hasReminder} />
      )}

      <ShopRoom shopId={shop.id} currentUser={currentUser} isOwner={isOwner}>
        <StreamSlot
          shop={shop}
          layout={layout}
          isOpen={isOpen}
          isScheduled={isScheduled}
          isOwner={isOwner}
          initialIsLive={shop.is_live}
          streamProvider={streamProvider}
          nativeEnabled={nativeLiveEnabled}
          embed={embed}
          profileId={profileId}
          hasLiveReminder={hasLiveReminder}
          liveReminderCount={liveReminderCount}
        />

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
        />

        {isScheduled && seller && layout !== "countdown" && !isDraftPreview && (
          <div className="mb-8 grid gap-4 lg:grid-cols-2">
            <ShareDropCard
              shopId={shop.id}
              shopName={shop.name}
              sellerHandle={seller.username}
              startAt={shop.start_at}
            />
          </div>
        )}

        {allSoldOut && !isOwner && seller && (
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
        )}

        {embed && !embed.embeddable && (
          <div className="mb-8">
            <LiveEmbedPlayer embed={embed} />
          </div>
        )}

        {isOwner && isOpen && (
          <div className="mb-8 space-y-4">
            <AuctionControls shopId={shop.id} products={shop.products} runs={auctionRuns} />
            <FlashControls products={shop.products} />
          </div>
        )}

        <AuctionLivePanel
          shopId={shop.id}
          initial={auctionPanel}
          isAuthed={Boolean(profileId)}
          isOwner={isOwner}
          userId={profileId ?? null}
        />

        <MainContent
          shop={shop}
          theme={theme}
          layout={layout}
          isOpen={isOpen}
          isScheduled={isScheduled}
          isOwner={isOwner}
          embed={embed}
          initialMessages={initialMessages}
          announcements={announcements}
          profileId={profileId}
        />
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
}) {
  const compact = layout === "broadcast" || layout === "countdown";

  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        compact && "mb-4",
      )}
    >
      <div className="space-y-2">
        <h1
          className={cn(
            "font-extrabold tracking-tight",
            layout === "countdown" ? "text-2xl" : "text-3xl",
          )}
        >
          {shop.name}
        </h1>
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
                {(seller.display_name || seller.username).charAt(0).toUpperCase()}
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
        <div className="flex items-center gap-2">
          {isOpen && <ViewerCount />}
          {layout !== "countdown" && (
            <Countdown startAt={shop.start_at} endAt={shop.end_at} draft={isDraftPreview} />
          )}
        </div>
        {isScheduled && !isOwner && theme.showReminderCta && (
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

function MainContent({
  shop,
  theme,
  layout,
  isOpen,
  isScheduled,
  isOwner,
  embed,
  initialMessages,
  announcements,
  profileId,
}: {
  shop: ShopWithDetails;
  theme: ShopTheme;
  layout: ShopTheme["layout"];
  isOpen: boolean;
  isScheduled: boolean;
  isOwner: boolean;
  embed: LiveEmbedInfo | null;
  initialMessages: ChatMessage[];
  announcements: Announcement[];
  profileId?: string;
}) {
  const productsSection = (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
        <Package className="size-5" />
        {isScheduled ? "Product preview" : "Products"}
      </h2>
      <ProductsGridLive
        shopId={shop.id}
        initialProducts={shop.products}
        isOpen={isOpen}
        isAuthed={Boolean(profileId)}
        startAt={shop.start_at}
        endAt={shop.end_at}
        gridColumns={theme.productGridColumns}
      />
    </section>
  );

  const chatAside =
    theme.showChat &&
    (isScheduled ? (
      <ShopAnnouncements
        shopId={shop.id}
        initialAnnouncements={announcements}
        isOwner={isOwner}
        isScheduled
      />
    ) : (
      <ShopChat
        initialMessages={initialMessages}
        isOpen={isOpen}
        startAt={shop.start_at}
        endAt={shop.end_at}
      />
    ));

  const catalogLive =
    layout === "catalog" && embed?.embeddable && isOpen ? (
      <div className="mb-4 overflow-hidden rounded-xl">
        <LiveEmbedPlayer embed={embed} />
      </div>
    ) : null;

  if (layout === "broadcast") {
    return (
      <div className="space-y-6">
        {productsSection}
        {chatAside && <aside>{chatAside}</aside>}
      </div>
    );
  }

  if (layout === "countdown") {
    return (
      <div className={cn("grid gap-6", chatAside && "lg:grid-cols-[1fr_320px]")}>
        <div className={cn(isScheduled && "opacity-90")}>{productsSection}</div>
        {chatAside && <aside>{chatAside}</aside>}
      </div>
    );
  }

  if (layout === "catalog") {
    return (
      <div className="space-y-6">
        {productsSection}
        <div className={cn("grid gap-6", chatAside && "lg:grid-cols-[1fr_360px]")}>
          <div>{catalogLive}</div>
          {chatAside && <aside>{chatAside}</aside>}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {productsSection}
      {chatAside && <aside>{chatAside}</aside>}
    </div>
  );
}
