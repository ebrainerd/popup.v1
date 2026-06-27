import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, Package, Truck } from "lucide-react";
import {
  getShopWithDetails,
  getChatMessages,
  getShopAnnouncements,
} from "@/lib/shops";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";
import { isReminderDeliveryConfigured } from "@/lib/reminder-delivery";
import { getDropReminderCount, getUserDropReminder } from "@/lib/drop-reminders";
import { parseLiveEmbed } from "@/lib/embeds";
import { deriveShopStatus, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/countdown";
import { FollowButton } from "@/components/follow-button";
import { RemindMeButton } from "@/components/remind-me-button";
import { ShareDropCard } from "@/components/share-drop-card";
import { WaitingRoomBanner } from "@/components/waiting-room-banner";
import { ShopAnnouncements } from "@/components/shop-announcements";
import { LiveEmbed } from "@/components/live-embed";
import { ReleaseHoldOnCancel } from "@/components/release-hold-on-cancel";
import { ShopRoom } from "@/components/shop-room";
import { ViewerCount } from "@/components/viewer-count";
import { ShopChat } from "@/components/shop-chat";
import { ProductsGridLive } from "@/components/products-grid-live";
import { FlashControls } from "@/components/flash-controls";
import { AuctionControls } from "@/components/auction-controls";
import { AuctionLivePanel } from "@/components/auction-live-panel";
import { getShopAuctionRuns, getLiveAuctionPanelState } from "@/lib/auctions";
import type { ChatSender } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const shop = await getShopWithDetails(id);
  if (!shop) return { title: "Shop not found" };

  const seller = shop.seller;
  const sellerLabel = seller ? `@${seller.username}` : "PopUp";
  const description =
    shop.description ??
    `${shop.name} by ${sellerLabel} — limited drop on PopUp. Opens ${new Date(shop.start_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`;
  const site = getSiteUrl();
  const ogImage = shop.cover_url ?? `${site}/opengraph-image`;

  return {
    title: shop.name,
    description,
    openGraph: {
      title: `${shop.name} · ${sellerLabel}`,
      description,
      url: `${site}/shop/${id}`,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: shop.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: shop.name,
      description,
      images: [ogImage],
    },
  };
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { id } = await params;
  const { checkout } = await searchParams;
  const profile = await getCurrentProfile();
  const shop = await getShopWithDetails(id, profile?.id);
  if (!shop) notFound();
  const status = deriveShopStatus(shop.start_at, shop.end_at);
  const isOpen = status === "open";
  const isScheduled = status === "scheduled";
  const seller = shop.seller;
  const isOwner = profile?.id === shop.seller_id;

  let isFollowing = false;
  let hasReminder = false;
  if (profile && seller && !isOwner) {
    const supabase = await createClient();
    const [{ data: follow }, reminder] = await Promise.all([
      supabase
        .from("shop_follows")
        .select("follower_id")
        .eq("seller_id", seller.id)
        .eq("follower_id", profile.id)
        .maybeSingle(),
      getUserDropReminder(shop.id, profile.id),
    ]);
    isFollowing = Boolean(follow);
    hasReminder = Boolean(reminder);
  } else if (profile) {
    hasReminder = Boolean(await getUserDropReminder(shop.id, profile.id));
  }

  const embed =
    isOpen && shop.live_url
      ? parseLiveEmbed(shop.live_url)
      : isOpen && shop.twitch_url
        ? parseLiveEmbed(shop.twitch_url)
        : null;
  const [initialMessages, announcements, reminderCount, auctionRuns, auctionPanel] =
    await Promise.all([
    getChatMessages(shop.id),
    getShopAnnouncements(shop.id),
    getDropReminderCount(shop.id),
    getShopAuctionRuns(shop.id),
    getLiveAuctionPanelState(shop.id, profile?.id ?? null),
  ]);

  const currentUser: ChatSender | null = profile
    ? {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      }
    : null;

  const allSoldOut =
    isOpen && shop.products.length > 0 && shop.products.every((p) => p.quantity === 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {checkout === "canceled" && <ReleaseHoldOnCancel shopId={shop.id} />}

      {isScheduled && (
        <WaitingRoomBanner startAt={shop.start_at} hasReminder={hasReminder} />
      )}

      {embed?.embeddable ? (
        <div className="mb-6">
          <LiveEmbed embed={embed} />
        </div>
      ) : (
        <div className="relative mb-6 aspect-[16/6] w-full overflow-hidden rounded-2xl bg-muted">
          {shop.cover_url ? (
            <Image src={shop.cover_url} alt={shop.name} fill className="object-cover" priority />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20" />
          )}
          <div className="absolute left-4 top-4 flex gap-2">
            {isOpen ? (
              <Badge variant="success">Open now</Badge>
            ) : isScheduled ? (
              <Badge variant="accent">Opening soon</Badge>
            ) : (
              <Badge variant="muted">Ended</Badge>
            )}
          </div>
          {isScheduled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="text-center text-white">
                <p className="text-sm font-medium uppercase tracking-widest opacity-90">
                  Drop opens in
                </p>
                <div className="mt-2 text-2xl font-bold">
                  <Countdown startAt={shop.start_at} endAt={shop.end_at} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <ShopRoom shopId={shop.id} currentUser={currentUser} isOwner={Boolean(isOwner)}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">{shop.name}</h1>
            {seller && (
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
            {shop.description && (
              <p className="max-w-2xl text-pretty text-muted-foreground">{shop.description}</p>
            )}
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="flex items-center gap-2">
              {isOpen && <ViewerCount />}
              <Countdown startAt={shop.start_at} endAt={shop.end_at} />
            </div>
            {isScheduled && !isOwner && (
              <div className="flex flex-wrap items-center gap-2">
                <RemindMeButton
                  shopId={shop.id}
                  initialSubscribed={hasReminder}
                  isAuthed={Boolean(profile)}
                  reminderCount={reminderCount}
                  deliveryConfigured={isReminderDeliveryConfigured()}
                />
                {seller && (
                  <FollowButton
                    sellerId={seller.id}
                    initialFollowing={isFollowing}
                    isAuthed={Boolean(profile)}
                  />
                )}
              </div>
            )}
            {isOpen && seller && !isOwner && (
              <FollowButton
                sellerId={seller.id}
                initialFollowing={isFollowing}
                isAuthed={Boolean(profile)}
              />
            )}
            {isOwner && (
              <Link
                href={`/dashboard/shops/${shop.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Manage this shop →
              </Link>
            )}
          </div>
        </div>

        {isScheduled && seller && (
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
                isAuthed={Boolean(profile)}
              />
            </div>
          </div>
        )}

        {embed && !embed.embeddable && (
          <div className="mb-8">
            <LiveEmbed embed={embed} />
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
          isAuthed={Boolean(profile)}
          isOwner={Boolean(isOwner)}
          userId={profile?.id ?? null}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <Package className="size-5" />
              {isScheduled ? "Product preview" : "Products"}
            </h2>
            <ProductsGridLive
              shopId={shop.id}
              initialProducts={shop.products}
              isOpen={isOpen}
              isAuthed={Boolean(profile)}
              startAt={shop.start_at}
              endAt={shop.end_at}
            />
          </section>

          <aside>
            {isScheduled ? (
              <ShopAnnouncements
                shopId={shop.id}
                initialAnnouncements={announcements}
                isOwner={Boolean(isOwner)}
                isScheduled
              />
            ) : (
              <ShopChat
                initialMessages={initialMessages}
                isOpen={isOpen}
                startAt={shop.start_at}
                endAt={shop.end_at}
              />
            )}
          </aside>
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Truck className="size-4" />
          {shop.shipping_rate > 0
            ? `Flat ${formatCurrency(shop.shipping_rate)} shipping included at checkout.`
            : "Free shipping included."}
        </p>
      </ShopRoom>
    </div>
  );
}
