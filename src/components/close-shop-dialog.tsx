"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleStop, TriangleAlert } from "lucide-react";
import { endShop } from "@/app/dashboard/actions";
import {
  getPendingAuctionSummary,
  type PendingAuctionSummary,
} from "@/app/shop/auction-actions";
import { useNow } from "@/components/countdown";
import { Button } from "@/components/ui/button";
import { deriveShopStatus, formatDurationMs } from "@/lib/utils";
import { formatInstantInTimeZone } from "@/lib/datetime";
import { DEFAULT_SCHEDULE_TIMEZONE } from "@/lib/timezones";

function formatScheduleMoment(iso: string, timeZone: string): string {
  return formatInstantInTimeZone(iso, timeZone, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZoneName: "short",
  });
}

export function CloseShopDialog({
  shopId,
  startAt,
  endAt,
  scheduleTimezone,
  open,
  onOpenChange,
}: {
  shopId: string;
  startAt: string;
  endAt: string;
  scheduleTimezone?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const now = useNow();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [auctionSummary, setAuctionSummary] = useState<PendingAuctionSummary | null>(null);

  // Check for unfinished auction lots each time the dialog opens, so the
  // seller is warned before cutting off a winner's checkout window.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getPendingAuctionSummary(shopId)
      .then((summary) => {
        if (!cancelled) setAuctionSummary(summary);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, shopId]);

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
  const tz = scheduleTimezone?.trim() || DEFAULT_SCHEDULE_TIMEZONE;
  const scheduleLabel = formatScheduleMoment(isOpen ? endAt : startAt, tz);

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

        <PendingAuctionWarning summary={auctionSummary} />

        {error && <p className="mt-3 text-sm text-live">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending
              ? "Closing…"
              : hasPendingAuctions(auctionSummary)
                ? "Close anyway"
                : "Close shop"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function hasPendingAuctions(summary: PendingAuctionSummary | null): boolean {
  if (!summary) return false;
  return summary.live > 0 || summary.awaitingPayment > 0 || summary.queuedWithBids > 0;
}

function PendingAuctionWarning({ summary }: { summary: PendingAuctionSummary | null }) {
  if (!hasPendingAuctions(summary) || !summary) return null;

  const risks: string[] = [];
  if (summary.awaitingPayment > 0) {
    risks.push(
      summary.awaitingPayment === 1
        ? "An auction winner hasn't paid yet. Winners can't check out after the shop closes, so you'd lose that sale."
        : `${summary.awaitingPayment} auction winners haven't paid yet. Winners can't check out after the shop closes, so you'd lose those sales.`,
    );
  }
  if (summary.live > 0) {
    risks.push(
      summary.live === 1
        ? "An auction is live right now. Its winner won't be able to pay once the shop is closed."
        : `${summary.live} auctions are live right now. Their winners won't be able to pay once the shop is closed.`,
    );
  }
  if (summary.queuedWithBids > 0) {
    risks.push(
      summary.queuedWithBids === 1
        ? "A queued lot already has pre-bids that will never run."
        : `${summary.queuedWithBids} queued lots already have pre-bids that will never run.`,
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-highlight/40 bg-highlight/10 p-3 text-sm">
      <p className="flex items-center gap-1.5 font-semibold text-foreground">
        <TriangleAlert className="size-4 text-highlight" />
        Auctions still pending
      </p>
      {risks.map((risk) => (
        <p key={risk} className="text-muted-foreground">
          {risk}
        </p>
      ))}
      <p className="text-muted-foreground">
        Safest move: wait until pending winners finish checkout (each has a 30-minute window)
        before closing.
      </p>
    </div>
  );
}

export function CloseShopButton({
  shopId,
  startAt,
  endAt,
  scheduleTimezone,
  size = "sm",
  variant = "ghost",
  className,
}: {
  shopId: string;
  startAt: string;
  endAt: string;
  scheduleTimezone?: string | null;
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
        scheduleTimezone={scheduleTimezone}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
