"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleLiveReminder } from "@/app/shop/live-reminder-actions";
import { ensureBrowserPushSubscription } from "@/lib/push-client";
import { cn } from "@/lib/utils";

export function NotifyWhenLiveButton({
  shopId,
  initialSubscribed,
  isAuthed,
  reminderCount,
}: {
  shopId: string;
  initialSubscribed: boolean;
  isAuthed: boolean;
  reminderCount: number;
}) {
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!isAuthed) {
      router.push(`/login?redirectTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setSubscribed((prev) => !prev);
    startTransition(async () => {
      const res = await toggleLiveReminder(shopId);
      if (res.error) {
        setSubscribed(initialSubscribed);
      } else {
        setSubscribed(res.subscribed);
        if (res.subscribed && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
          await ensureBrowserPushSubscription();
        }
        router.refresh();
      }
    });
  }

  const socialProof =
    reminderCount >= 5
      ? `${reminderCount} people want a live alert`
      : "Get notified when the seller goes live";

  return (
    <div className="flex flex-col items-center gap-1.5 sm:items-start">
      <Button
        onClick={onClick}
        disabled={pending}
        size="lg"
        className={cn("rounded-full shadow-lg", subscribed && "bg-accent text-accent-foreground")}
      >
        {subscribed ? <BellOff className="size-4" /> : <Bell className="size-4" />}
        {subscribed ? "Cancel live alert" : "Notify me when live"}
      </Button>
      <p className="text-xs text-white/90 drop-shadow-sm">{socialProof}</p>
    </div>
  );
}
