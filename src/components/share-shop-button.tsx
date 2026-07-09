"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildBuyerShareCaption } from "@/lib/share-captions";

export function ShareShopButton({
  shopId,
  shopName,
  sellerHandle,
  className,
}: {
  shopId: string;
  shopName: string;
  sellerHandle: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = `${window.location.origin}/shop/${shopId}`;
    const text = buildBuyerShareCaption(shopName, sellerHandle);
    if (navigator.share) {
      try {
        await navigator.share({ title: shopName, text, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={onShare}
    >
      {copied ? <Check className="size-4 text-success" /> : <Share2 className="size-4" />}
      {copied ? "Copied!" : "Share shop"}
    </Button>
  );
}
