"use client";

import { useState } from "react";
import { Check, Link2, Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildSellerShareCaptions } from "@/lib/share-captions";

const SHARE_COPIED_KEY = "popup-share-copied";

function markShareCopied(shopId: string) {
  localStorage.setItem(`${SHARE_COPIED_KEY}:${shopId}`, "1");
  window.dispatchEvent(new Event("popup-share-copied"));
}

export function ShareDropCard({
  shopId,
  shopName,
  sellerHandle,
  startAt,
  shopUrl,
  variant = "default",
}: {
  shopId: string;
  shopName: string;
  sellerHandle: string;
  startAt: string;
  /** Full shop URL for SSR / dashboard previews (avoids hydration mismatch). */
  shopUrl?: string;
  variant?: "default" | "dashboard";
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState<string | null>(null);
  const fallbackUrl = `/shop/${shopId}`;
  const url =
    shopUrl ??
    (typeof window !== "undefined" ? `${window.location.origin}${fallbackUrl}` : fallbackUrl);
  const captions = buildSellerShareCaptions(shopName, sellerHandle, startAt);

  function copyText(text: string, kind: "link" | string) {
    navigator.clipboard.writeText(text).then(() => {
      if (kind === "link") {
        setCopiedLink(true);
        markShareCopied(shopId);
        setTimeout(() => setCopiedLink(false), 1500);
      } else {
        setCopiedCaption(kind);
        markShareCopied(shopId);
        setTimeout(() => setCopiedCaption(null), 1500);
      }
    });
  }

  async function nativeShare() {
    const shareUrl =
      shopUrl ??
      (typeof window !== "undefined" ? `${window.location.origin}/shop/${shopId}` : fallbackUrl);
    if (navigator.share) {
      try {
        await navigator.share({ title: shopName, text: `${captions[0].text}\n${shareUrl}`, url: shareUrl });
        markShareCopied(shopId);
        return;
      } catch {
        copyText(shareUrl, "link");
      }
    } else {
      copyText(shareUrl, "link");
    }
  }

  const content = (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => copyText(url, "link")}>
          {copiedLink ? <Check className="size-4 text-success" /> : <Link2 className="size-4" />}
          {copiedLink ? "Copied!" : "Copy shop link"}
        </Button>
        <Button variant="outline" size="sm" onClick={nativeShare}>
          <Share2 className="size-4" />
          Share
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your link</p>
        <p className="mt-1 break-all font-mono text-sm text-foreground">{url}</p>
      </div>
      <div className="space-y-2">
        {captions.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-muted/40 p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {c.label}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => copyText(`${c.text}\n${url}`, c.label)}
              >
                {copiedCaption === c.label ? (
                  <Check className="size-3.5 text-success" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{c.text}</p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground/80">{url}</p>
          </div>
        ))}
      </div>
    </>
  );

  if (variant === "dashboard") {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-4">
        <div className="mb-3">
          <p className="flex items-center gap-2 font-semibold leading-none">
            <Share2 className="size-4" />
            Share your drop
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Copy a caption + link for IG, TikTok, or your group chat.
          </p>
        </div>
        <div className="space-y-3">{content}</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="size-4" />
          Share your shop link
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Text or post this link to your audience before the countdown hits zero.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">{content}</CardContent>
    </Card>
  );
}
