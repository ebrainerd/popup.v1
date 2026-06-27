import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Settings } from "lucide-react";
import type { Shop } from "@/lib/database.types";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/countdown";
import { deriveShopStatus, formatCurrency } from "@/lib/utils";

export function SellerShopRow({ shop }: { shop: Shop }) {
  const status = deriveShopStatus(shop.start_at, shop.end_at);
  const isDraft = shop.status === "draft";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {shop.cover_url ? (
          <Image src={shop.cover_url} alt={shop.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15 font-bold text-primary/60">
            {shop.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold">{shop.name}</p>
          {isDraft && <Badge variant="muted">Draft</Badge>}
          {!isDraft && shop.is_live && status === "open" && <Badge variant="live">LIVE</Badge>}
          {shop.visibility === "private" && <Badge variant="muted">Private</Badge>}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Countdown startAt={shop.start_at} endAt={shop.end_at} compact />
          <span>·</span>
          <span>
            {shop.shipping_rate > 0
              ? `${formatCurrency(shop.shipping_rate)} shipping`
              : "Free shipping"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Link
          href={`/shop/${shop.id}`}
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="View public shop"
        >
          <ExternalLink className="size-4" />
        </Link>
        <Link
          href={isDraft ? `/dashboard/shops/${shop.id}/setup` : `/dashboard/shops/${shop.id}`}
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={isDraft ? "Continue shop setup" : "Manage shop"}
        >
          <Settings className="size-4" />
        </Link>
      </div>
    </div>
  );
}
