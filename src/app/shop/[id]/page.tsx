import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, Package, Truck } from "lucide-react";
import { getShopWithDetails, getChatMessages } from "@/lib/shops";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseLiveEmbed } from "@/lib/embeds";
import { deriveShopStatus, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/countdown";
import { FollowButton } from "@/components/follow-button";
import { LiveEmbed } from "@/components/live-embed";
import { ShopRoom } from "@/components/shop-room";
import { ViewerCount } from "@/components/viewer-count";
import { ShopChat } from "@/components/shop-chat";
import { ProductsGridLive } from "@/components/products-grid-live";
import { FlashControls } from "@/components/flash-controls";
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
  return {
    title: shop.name,
    description: shop.description ?? `Shop ${shop.name} on PopUp`,
  };
}

export default async function ShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shop = await getShopWithDetails(id);
  if (!shop) notFound();

  const profile = await getCurrentProfile();
  const status = deriveShopStatus(shop.start_at, shop.end_at);
  const isOpen = status === "open";
  const seller = shop.seller;
  const isOwner = profile?.id === shop.seller_id;

  let isFollowing = false;
  if (profile && seller && !isOwner) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("shop_follows")
      .select("follower_id")
      .eq("seller_id", seller.id)
      .eq("follower_id", profile.id)
      .maybeSingle();
    isFollowing = Boolean(data);
  }

  const embed = isOpen && shop.is_live ? parseLiveEmbed(shop.live_url) : null;
  const initialMessages = await getChatMessages(shop.id);

  const currentUser: ChatSender | null = profile
    ? {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      }
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Cover */}
      <div className="relative mb-6 aspect-[16/6] w-full overflow-hidden rounded-2xl bg-muted">
        {shop.cover_url ? (
          <Image src={shop.cover_url} alt={shop.name} fill className="object-cover" priority />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20" />
        )}
        <div className="absolute left-4 top-4 flex gap-2">
          {shop.is_live && isOpen ? (
            <Badge variant="live">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-white animate-live-pulse" />
              LIVE
            </Badge>
          ) : isOpen ? (
            <Badge variant="success">Open now</Badge>
          ) : status === "scheduled" ? (
            <Badge variant="accent">Opening soon</Badge>
          ) : (
            <Badge variant="muted">Ended</Badge>
          )}
        </div>
      </div>

      <ShopRoom shopId={shop.id} currentUser={currentUser} isOwner={Boolean(isOwner)}>
        {/* Header */}
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
              <ViewerCount />
              <Countdown startAt={shop.start_at} endAt={shop.end_at} />
            </div>
            {seller && !isOwner && (
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

        {/* Live embed */}
        {embed && (
          <div className="mb-8">
            <LiveEmbed embed={embed} />
          </div>
        )}

        {/* Seller flash-drop controls */}
        {isOwner && isOpen && (
          <div className="mb-8">
            <FlashControls products={shop.products} />
          </div>
        )}

        {/* Products + chat */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <Package className="size-5" />
              Products
            </h2>
            <ProductsGridLive
              shopId={shop.id}
              initialProducts={shop.products}
              isOpen={isOpen}
              isAuthed={Boolean(profile)}
            />
          </section>

          <aside>
            <ShopChat initialMessages={initialMessages} isOpen={isOpen} />
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
