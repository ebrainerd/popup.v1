"use client";

import { useState } from "react";
import { Check, Link2, Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Caption = { label: string; text: string };

function buildCaptions(shopName: string, sellerHandle: string, startAt: string): Caption[] {
  const when = new Date(startAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return [
    {
      label: "Short social",
      text: `🔥 ${shopName} drops ${when}. Set a reminder so you don't miss it →`,
    },
    {
      label: "Live shopping",
      text: `Going live for ${shopName} on PopUp! Join @${sellerHandle} for flash drops and limited items.`,
    },
    {
      label: "Countdown",
      text: `⏰ ${when} — ${shopName} opens on PopUp. Tap the link and hit "Remind me" before it sells out.`,
    },
  ];
}

export function ShareDropCard({
  shopId,
  shopName,
  sellerHandle,
  startAt,
}: {
  shopId: string;
  shopName: string;
  sellerHandle: string;
  startAt: string;
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState<string | null>(null);
  const url = typeof window !== "undefined" ? `${window.location.origin}/shop/${shopId}` : `/shop/${shopId}`;
  const captions = buildCaptions(shopName, sellerHandle, startAt);

  function copyText(text: string, kind: "link" | string) {
    navigator.clipboard.writeText(text).then(() => {
      if (kind === "link") {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 1500);
      } else {
        setCopiedCaption(kind);
        setTimeout(() => setCopiedCaption(null), 1500);
      }
    });
  }

  async function nativeShare() {
    const shareUrl = `${window.location.origin}/shop/${shopId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: shopName, text: captions[0].text, url: shareUrl });
      } catch {
        copyText(shareUrl, "link");
      }
    } else {
      copyText(shareUrl, "link");
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="size-4" />
          Share this drop
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => copyText(url, "link")}>
            {copiedLink ? <Check className="size-4 text-success" /> : <Link2 className="size-4" />}
            {copiedLink ? "Copied!" : "Copy link"}
          </Button>
          <Button variant="outline" size="sm" onClick={nativeShare}>
            <Share2 className="size-4" />
            Share
          </Button>
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
