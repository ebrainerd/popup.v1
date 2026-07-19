import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
import { getLiveReminderCount, getUserLiveReminder } from "@/lib/live-reminders";
import { parseLiveEmbed } from "@/lib/embeds";
import { effectiveStreamProvider, isNativeLiveEnabled } from "@/lib/live-stream";
import { derivePublishedShopWindow } from "@/lib/utils";
import { formatShopScheduleWhen } from "@/lib/datetime";
import { DEFAULT_SCHEDULE_TIMEZONE } from "@/lib/timezones";
import { ShopThemeShell } from "@/components/shop-theme-shell";
import { ShopPageView } from "@/components/shop-page-view";
import {
  getShopAuctionRuns,
  getLiveAuctionPanelState,
  autoQueueShopAuctions,
  expireDueAuctionPayments,
  finalizeDueShopAuctions,
  getAuctionProductStates,
} from "@/lib/auctions";
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
  const opensWhen = formatShopScheduleWhen(
    shop.start_at,
    shop.schedule_timezone?.trim() || DEFAULT_SCHEDULE_TIMEZONE,
  );
  const description =
    shop.description ??
    `${shop.name} by ${sellerLabel} — limited drop on PopUp. Opens ${opensWhen}.`;
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

  const seller = shop.seller;
  const isOwner = profile?.id === shop.seller_id;
  const window = derivePublishedShopWindow(shop);
  const isDraftPreview = window.isDraft && isOwner;
  const isOpen = window.isOpen;
  const isScheduled = isDraftPreview || window.isScheduled;

  const draftPreviewScheduleLabel =
    window.schedule === "open"
      ? "Your planned window has started — publish when you're ready."
      : window.schedule === "ended"
        ? "Your planned window has ended — update the schedule in Shop details."
        : "This is how buyers will see your drop when you publish and it opens.";

  let isFollowing = false;
  let hasReminder = false;
  let hasLiveReminder = false;
  if (profile && seller && !isOwner) {
    const supabase = await createClient();
    const [{ data: follow }, reminder, liveReminder] = await Promise.all([
      supabase
        .from("shop_follows")
        .select("follower_id")
        .eq("seller_id", seller.id)
        .eq("follower_id", profile.id)
        .maybeSingle(),
      getUserDropReminder(shop.id, profile.id),
      getUserLiveReminder(shop.id, profile.id),
    ]);
    isFollowing = Boolean(follow);
    hasReminder = Boolean(reminder);
    hasLiveReminder = Boolean(liveReminder);
  } else if (profile) {
    const [reminder, liveReminder] = await Promise.all([
      getUserDropReminder(shop.id, profile.id),
      getUserLiveReminder(shop.id, profile.id),
    ]);
    hasReminder = Boolean(reminder);
    hasLiveReminder = Boolean(liveReminder);
  }

  const streamProvider = effectiveStreamProvider(shop);
  const nativeLiveEnabled = isNativeLiveEnabled();
  const embed =
    isOpen && shop.is_live && streamProvider !== "native"
      ? shop.twitch_url
        ? parseLiveEmbed(shop.twitch_url)
        : shop.live_url
          ? parseLiveEmbed(shop.live_url)
          : null
      : null;
  // Queue pre-bid lots for published shops (pre-open included) and expire
  // any unpaid auction wins whose checkout window lapsed.
  if (isOpen || isScheduled) {
    await autoQueueShopAuctions(shop.id);
  }
  await expireDueAuctionPayments(shop.id);
  await finalizeDueShopAuctions(shop.id);

  const [initialMessages, announcements, reminderCount, liveReminderCount, auctionRuns, auctionPanel, auctionProductStates] =
    await Promise.all([
      getChatMessages(shop.id),
      getShopAnnouncements(shop.id),
      getDropReminderCount(shop.id),
      getLiveReminderCount(shop.id),
      getShopAuctionRuns(shop.id),
      getLiveAuctionPanelState(shop.id, profile?.id ?? null),
      getAuctionProductStates(shop.id, profile?.id ?? null),
    ]);

  const currentUser: ChatSender | null = profile
    ? {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      }
    : null;

  return (
    <ShopThemeShell theme={shop.shop_theme}>
      <ShopPageView
        shop={shop}
        theme={shop.shop_theme}
        isOpen={isOpen}
        isScheduled={isScheduled}
        isDraftPreview={isDraftPreview}
        draftPreviewScheduleLabel={draftPreviewScheduleLabel}
        isOwner={Boolean(isOwner)}
        seller={seller}
        profileId={profile?.id}
        isFollowing={isFollowing}
        hasReminder={hasReminder}
        reminderCount={reminderCount}
        reminderDeliveryConfigured={isReminderDeliveryConfigured()}
        embed={embed}
        streamProvider={streamProvider}
        nativeLiveEnabled={nativeLiveEnabled}
        hasLiveReminder={hasLiveReminder}
        liveReminderCount={liveReminderCount}
        initialMessages={initialMessages}
        announcements={announcements}
        auctionRuns={auctionRuns}
        auctionPanel={auctionPanel}
        auctionProductStates={auctionProductStates}
        currentUser={currentUser}
        checkoutCanceled={checkout === "canceled"}
      />
    </ShopThemeShell>
  );
}
