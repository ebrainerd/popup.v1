"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ExternalLink, Rocket, Clock } from "lucide-react";
import { publishShop, extendShop } from "@/app/dashboard/actions";
import { CloseShopButton } from "@/components/close-shop-dialog";
import { isInviteOnlyMode } from "@/lib/discovery";
import { Button } from "@/components/ui/button";

export function PublishControls({
  shopId,
  isDraft,
  isOpen,
  isEnded,
  productCount,
  startAt,
  endAt,
}: {
  shopId: string;
  isDraft: boolean;
  isOpen: boolean;
  isEnded: boolean;
  productCount: number;
  startAt: string;
  endAt: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canPublish = productCount >= 1;
  const inviteOnly = isInviteOnlyMode();

  function publish() {
    setError(null);
    startTransition(async () => {
      const res = await publishShop(shopId);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function onExtend(minutes: number) {
    setError(null);
    startTransition(async () => {
      const res = await extendShop(shopId, minutes);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  if (isDraft) {
    return (
      <div className="rounded-xl border border-highlight/40 bg-highlight/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <EyeOff className="size-5 text-highlight" />
            <div>
              <p className="font-medium">This drop is a draft</p>
              <p className="text-sm text-muted-foreground">
                {canPublish
                  ? inviteOnly
                    ? "Preview your shop, then publish when you're ready for buyers."
                    : "Preview your shop — it's hidden from Explore and search until you publish."
                  : "Add at least one product, then preview and publish so buyers can check out."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" disabled={pending}>
              <Link href={`/shop/${shopId}`}>
                <Eye className="size-4" />
                Preview shop
              </Link>
            </Button>
            <Button onClick={publish} disabled={pending || !canPublish} className="rounded-full">
            <Rocket className="size-4" />
            {pending ? "Publishing…" : "Publish drop"}
            </Button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-live">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-success/30 bg-success/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-success">
          <Eye className="size-4" />
          {isEnded
            ? "Shop closed"
            : inviteOnly
              ? "Published — share your shop link from the checklist"
              : "Published & findable"}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {!isEnded && (
            <Button asChild size="sm">
              <Link href={`/shop/${shopId}`}>
                <ExternalLink className="size-4" />
                Go to shop
              </Link>
            </Button>
          )}
          {isOpen && !isEnded && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Add more time</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExtend(15)}
                disabled={pending}
              >
                <Clock className="size-4" /> +15m
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExtend(60)}
                disabled={pending}
              >
                +1h
              </Button>
            </div>
          )}
          {!isEnded && (
            <CloseShopButton shopId={shopId} startAt={startAt} endAt={endAt} />
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-live">{error}</p>}
    </div>
  );
}
