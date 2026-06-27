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
import { parseLiveEmbed } from "@/lib/embeds";
import { deriveShopStatus } from "@/lib/utils";
import { ShopThemeShell } from "@/components/shop-theme-shell";
import { ShopPageView } from "@/components/shop-page-view";
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

  return (
    <ShopThemeShell theme={shop.shop_theme}>
      <ShopPageView
        shop={shop}
        theme={shop.shop_theme}
        isOpen={isOpen}
        isScheduled={isScheduled}
        isOwner={Boolean(isOwner)}
        seller={seller}
        profileId={profile?.id}
        isFollowing={isFollowing}
        hasReminder={hasReminder}
        reminderCount={reminderCount}
        reminderDeliveryConfigured={isReminderDeliveryConfigured()}
        embed={embed}
        initialMessages={initialMessages}
        announcements={announcements}
        auctionRuns={auctionRuns}
        auctionPanel={auctionPanel}
        currentUser={currentUser}
        checkoutCanceled={checkout === "canceled"}
      />
    </ShopThemeShell>
  );
}
