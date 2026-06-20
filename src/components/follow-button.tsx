"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleFollow } from "@/app/shop/actions";
import { cn } from "@/lib/utils";

export function FollowButton({
  sellerId,
  initialFollowing,
  isAuthed,
}: {
  sellerId: string;
  initialFollowing: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!isAuthed) {
      router.push(`/login?redirectTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    // Optimistic update
    setFollowing((prev) => !prev);
    startTransition(async () => {
      const res = await toggleFollow(sellerId);
      if (res.error) {
        setFollowing(initialFollowing);
      } else {
        setFollowing(res.following);
      }
    });
  }

  return (
    <Button
      onClick={onClick}
      disabled={pending}
      variant={following ? "outline" : "default"}
      size="sm"
    >
      <Heart className={cn("size-4", following && "fill-current text-primary")} />
      {following ? "Following" : "Follow"}
    </Button>
  );
}
