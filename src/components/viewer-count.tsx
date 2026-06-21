"use client";

import { Eye } from "lucide-react";
import { useShopRoom } from "@/components/shop-room";
import { cn } from "@/lib/utils";

export function ViewerCount({ className }: { className?: string }) {
  const { viewerCount, ready } = useShopRoom();
  if (!ready) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold",
        className,
      )}
      title="People in the room right now"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-live-pulse" />
      <Eye className="size-3.5" />
      {viewerCount} in the room
    </span>
  );
}
