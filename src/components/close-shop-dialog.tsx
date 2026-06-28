"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleStop } from "lucide-react";
import { endShop } from "@/app/dashboard/actions";
import { useNow } from "@/components/countdown";
import { Button } from "@/components/ui/button";
import { deriveShopStatus, formatDurationMs } from "@/lib/utils";

function formatScheduleMoment(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function CloseShopDialog({
  shopId,
  startAt,
  endAt,
  open,
  onOpenChange,
}: {
  shopId: string;
  startAt: string;
  endAt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const now = useNow();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const currentMs = now;
  if (currentMs === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg text-sm text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  const schedule = deriveShopStatus(startAt, endAt, new Date(currentMs));
  const isOpen = schedule === "open";
  const remainingMs = isOpen
    ? new Date(endAt).getTime() - currentMs
    : new Date(startAt).getTime() - currentMs;
  const remainingLabel = formatDurationMs(remainingMs);
  const scheduleLabel = formatScheduleMoment(isOpen ? endAt : startAt);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await endShop(shopId);
      if (res.error) {
        setError(res.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg"
        role="dialog"
        aria-labelledby="close-shop-title"
        aria-modal="true"
      >
        <h3 id="close-shop-title" className="text-lg font-semibold">
          Close shop?
        </h3>
        {isOpen ? (
          <div className="mt-2 space-y-2 text-sm text-muted-foreground">
            <p>
              Buyers won&apos;t be able to purchase anymore. Existing orders and your drop report
              are unaffected.
            </p>
            <p>
              This shop was scheduled to stay open for another{" "}
              <strong className="text-foreground">{remainingLabel}</strong> (until {scheduleLabel}
              ).
            </p>
          </div>
        ) : (
          <div className="mt-2 space-y-2 text-sm text-muted-foreground">
            <p>
              This drop won&apos;t open on schedule and reminder emails won&apos;t send. Existing
              orders are unaffected.
            </p>
            <p>
              It was scheduled to open in{" "}
              <strong className="text-foreground">{remainingLabel}</strong> ({scheduleLabel}).
            </p>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-live">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? "Closing…" : "Close shop"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CloseShopButton({
  shopId,
  startAt,
  endAt,
  size = "sm",
  variant = "ghost",
  className,
}: {
  shopId: string;
  startAt: string;
  endAt: string;
  size?: "sm" | "default";
  variant?: "ghost" | "outline";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <CircleStop className="size-4" />
        Close shop
      </Button>
      <CloseShopDialog
        shopId={shopId}
        startAt={startAt}
        endAt={endAt}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
