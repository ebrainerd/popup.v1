import Link from "next/link";
import Image from "next/image";
import { Eye, Star } from "lucide-react";
import type { ShopWithSeller } from "@/lib/shops";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/countdown";
import { deriveShopStatus, cn } from "@/lib/utils";

export function ShopCard({ shop }: { shop: ShopWithSeller }) {
  const status = deriveShopStatus(shop.start_at, shop.end_at);
  const seller = shop.seller;
  const isLive = status === "open" && (shop.is_live || shop.live_url);

  return (
    <Link
      href={`/shop/${shop.id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isLive && "animate-live-glow",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {shop.cover_url ? (
          <Image
            src={shop.cover_url}
            alt={shop.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15 text-3xl font-extrabold text-primary/60">
            {shop.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="absolute left-2 top-2 flex gap-1.5">
          {status === "open" && (shop.is_live || shop.live_url) ? (
            <Badge variant="live">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-white animate-live-pulse" />
              LIVE
            </Badge>
          ) : status === "open" ? (
            <Badge variant="success">Open now</Badge>
          ) : status === "scheduled" ? (
            <Badge variant="accent">Opening soon</Badge>
          ) : (
            <Badge variant="muted">Ended</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold">{shop.name}</h3>
          <Countdown startAt={shop.start_at} endAt={shop.end_at} compact />
        </div>

        <div className="mt-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {seller?.avatar_url ? (
              <Image
                src={seller.avatar_url}
                alt={seller.username}
                width={20}
                height={20}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                {(seller?.username ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
            <span className="line-clamp-1">@{seller?.username ?? "seller"}</span>
          </div>

          {seller?.rating_count && seller.rating_count > 0 ? (
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-current text-primary" />
              {Number(seller.rating_avg ?? 0).toFixed(1)}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs">
              <Eye className="size-3.5" />
              New
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
