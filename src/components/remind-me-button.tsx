"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleDropReminder } from "@/app/shop/reminder-actions";
import { cn } from "@/lib/utils";

export function RemindMeButton({
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
      const res = await toggleDropReminder(shopId);
      if (res.error) {
        setSubscribed(initialSubscribed);
      } else {
        setSubscribed(res.subscribed);
      }
    });
  }

  const socialProof =
    reminderCount >= 5
      ? `${reminderCount} people want a reminder`
      : "Be first in the room";

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        onClick={onClick}
        disabled={pending}
        size="lg"
        className={cn("rounded-full", subscribed && "bg-accent text-accent-foreground")}
      >
        {subscribed ? <BellOff className="size-4" /> : <Bell className="size-4" />}
        {subscribed ? "Cancel reminder" : "Remind me"}
      </Button>
      <p className="text-xs text-muted-foreground">{socialProof}</p>
    </div>
  );
}
