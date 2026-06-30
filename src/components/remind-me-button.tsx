"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleDropReminder, enableReminderPush } from "@/app/shop/reminder-actions";
import { ensureBrowserPushSubscription } from "@/lib/push-client";
import { cn } from "@/lib/utils";

export function RemindMeButton({
  shopId,
  initialSubscribed,
  isAuthed,
  reminderCount,
  deliveryConfigured,
}: {
  shopId: string;
  initialSubscribed: boolean;
  isAuthed: boolean;
  reminderCount: number;
  deliveryConfigured: boolean;
}) {
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [pending, startTransition] = useTransition();

  const useWaitlistCopy = !deliveryConfigured;
  const joinLabel = useWaitlistCopy ? "Join waitlist" : "Remind me";
  const cancelLabel = useWaitlistCopy ? "Leave waitlist" : "Cancel reminder";

  function onClick() {
    if (!isAuthed) {
      router.push(`/login?redirectTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setSubscribed((prev) => !prev);
    startTransition(async () => {
      const res = await toggleDropReminder(shopId);
      if (res.error) {
        setSubscribed(initialSubscribed);
      } else {
        setSubscribed(res.subscribed);
        if (res.subscribed && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
          const pushOk = await ensureBrowserPushSubscription();
          if (pushOk) await enableReminderPush(shopId);
        }
      }
    });
  }

  const socialProof = useWaitlistCopy
    ? reminderCount >= 5
      ? `${reminderCount} people on the waitlist`
      : "Be first on the waitlist"
    : reminderCount >= 5
      ? `${reminderCount} people want a reminder`
      : "Be first in the room";

  const helper = useWaitlistCopy
    ? "We’ll notify you when reminders are live — you’re on the list for now."
    : null;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        onClick={onClick}
        disabled={pending}
        size="lg"
        className={cn("rounded-full", subscribed && "bg-accent text-accent-foreground")}
      >
        {subscribed ? (
          useWaitlistCopy ? <Users className="size-4" /> : <BellOff className="size-4" />
        ) : (
          <Bell className="size-4" />
        )}
        {subscribed ? cancelLabel : joinLabel}
      </Button>
      <p className="text-xs text-muted-foreground">{socialProof}</p>
      {subscribed && helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
