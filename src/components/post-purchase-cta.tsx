import Link from "next/link";
import { Bell, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FollowButton } from "@/components/follow-button";
import type { BuyerOrder } from "@/lib/orders";

export function PostPurchaseCta({
  orders,
  followingSellerIds,
}: {
  orders: BuyerOrder[];
  followingSellerIds: Set<string>;
}) {
  if (orders.length === 0) return null;

  const latest = orders[0];
  const primaryShop = latest.shop;
  const primarySeller = primaryShop?.seller;

  const sellers = new Map<
    string,
    { sellerId: string; username: string; shopId: string; shopName: string }
  >();
  for (const o of orders.slice(0, 5)) {
    const shop = o.shop;
    const seller = shop?.seller;
    if (shop && seller && shop.seller_id && !sellers.has(shop.seller_id)) {
      sellers.set(shop.seller_id, {
        sellerId: shop.seller_id,
        username: seller.username,
        shopId: shop.id,
        shopName: shop.name,
      });
    }
  }

  const alreadyFollowingPrimary =
    primaryShop?.seller_id ? followingSellerIds.has(primaryShop.seller_id) : false;

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardContent className="space-y-4 p-4">
        <p className="font-semibold">You caught the drop 🎉</p>
        {primarySeller && primaryShop && (
          <div className="flex flex-wrap items-center gap-3">
            {alreadyFollowingPrimary ? (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href={`/u/${primarySeller.username}`}>
                  <Heart className="size-4 fill-current" />
                  Following @{primarySeller.username}
                </Link>
              </Button>
            ) : (
              <FollowButton
                sellerId={primaryShop.seller_id}
                initialFollowing={false}
                isAuthed
              />
            )}
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href={`/shop/${primaryShop.id}`}>
                <Bell className="size-4" />
                Join their next waitlist
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link href={`/shop/${primaryShop.id}`}>
                <Share2 className="size-4" />
                Share
              </Link>
            </Button>
          </div>
        )}
        {sellers.size > 1 && (
          <div className="border-t border-border pt-3">
            <p className="mb-2 text-sm text-muted-foreground">Creators you bought from:</p>
            <ul className="space-y-1 text-sm">
              {Array.from(sellers.values()).map((s) => (
                <li key={s.sellerId}>
                  <Link
                    href={`/u/${s.username}`}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    <Heart className="size-3.5" />
                    @{s.username}
                  </Link>
                  <span className="text-muted-foreground"> · {s.shopName}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
