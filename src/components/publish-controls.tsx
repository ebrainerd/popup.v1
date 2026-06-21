"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Rocket } from "lucide-react";
import { publishShop, unpublishShop } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

export function PublishControls({
  shopId,
  isDraft,
  productCount,
}: {
  shopId: string;
  isDraft: boolean;
  productCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canPublish = productCount >= 1;

  function publish() {
    setError(null);
    startTransition(async () => {
      const res = await publishShop(shopId);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function unpublish() {
    startTransition(async () => {
      await unpublishShop(shopId);
      router.refresh();
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
                  ? "It's hidden from Explore and search until you publish."
                  : "Add at least one product, then publish to make it findable."}
              </p>
            </div>
          </div>
          <Button onClick={publish} disabled={pending || !canPublish} className="rounded-full">
            <Rocket className="size-4" />
            {pending ? "Publishing…" : "Publish drop"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-live">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/10 p-3">
      <span className="flex items-center gap-2 text-sm font-medium text-success">
        <Eye className="size-4" /> Published &amp; findable
      </span>
      <Button variant="ghost" size="sm" onClick={unpublish} disabled={pending}>
        Unpublish
      </Button>
    </div>
  );
}
