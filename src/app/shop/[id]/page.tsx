import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, Package, Truck } from "lucide-react";
import { getShopWithDetails } from "@/lib/shops";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseLiveEmbed } from "@/lib/embeds";
import { deriveShopStatus, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/countdown";
import { FollowButton } from "@/components/follow-button";
import { BuyButton } from "@/components/buy-button";
import { LiveEmbed } from "@/components/live-embed";

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

  const user = await getCurrentUser();
  const status = deriveShopStatus(shop.start_at, shop.end_at);
  const isOpen = status === "open";
  const seller = shop.seller;
  const isOwner = user?.id === shop.seller_id;

  let isFollowing = false;
  if (user && seller && !isOwner) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("shop_follows")
      .select("follower_id")
      .eq("seller_id", seller.id)
      .eq("follower_id", user.id)
      .maybeSingle();
    isFollowing = Boolean(data);
  }

  const embed = isOpen && shop.is_live ? parseLiveEmbed(shop.live_url) : null;

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
          <Countdown startAt={shop.start_at} endAt={shop.end_at} />
          {seller && !isOwner && (
            <FollowButton
              sellerId={seller.id}
              initialFollowing={isFollowing}
              isAuthed={Boolean(user)}
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

      {/* Products */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Package className="size-5" />
          Products
        </h2>

        {shop.products.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
            No products listed yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shop.products.map((product) => {
              const discounted =
                product.discount_price != null && product.discount_price < product.price;
              const soldOut = product.quantity <= 0;
              return (
                <div
                  key={product.id}
                  className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="relative aspect-square w-full bg-muted">
                    {product.photo_url ? (
                      <Image
                        src={product.photo_url}
                        alt={product.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Package className="size-8" />
                      </div>
                    )}
                    {product.is_flash_only && (
                      <Badge variant="accent" className="absolute left-2 top-2">
                        Flash item
                      </Badge>
                    )}
                    {soldOut && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                        <Badge variant="muted">Sold out</Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="font-semibold">{product.title}</h3>
                    {product.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {product.description}
                      </p>
                    )}
                    <div className="mt-auto flex items-end justify-between pt-2">
                      <div>
                        {discounted ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-live">
                              {formatCurrency(product.discount_price!)}
                            </span>
                            <span className="text-sm text-muted-foreground line-through">
                              {formatCurrency(product.price)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold">
                            {formatCurrency(product.price)}
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {soldOut ? "Out of stock" : `${product.quantity} left`}
                        </p>
                      </div>
                      <BuyButton
                        shopId={shop.id}
                        productId={product.id}
                        isOpen={isOpen}
                        soldOut={soldOut}
                        isAuthed={Boolean(user)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Truck className="size-4" />
        {shop.shipping_rate > 0
          ? `Flat ${formatCurrency(shop.shipping_rate)} shipping included at checkout.`
          : "Free shipping included."}
      </p>
    </div>
  );
}
