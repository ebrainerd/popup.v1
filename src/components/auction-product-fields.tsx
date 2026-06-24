"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AUCTION_DURATION_PRESETS } from "@/lib/auction-bidding";

export type SaleType = "buy_now" | "auction";

export type AuctionFieldState = {
  saleType: SaleType;
  startingBid: string;
  minIncrement: string;
  durationSeconds: number;
  allowPrebids: boolean;
  suddenDeath: boolean;
};

export const defaultAuctionFields = (): AuctionFieldState => ({
  saleType: "buy_now",
  startingBid: "",
  minIncrement: "1.00",
  durationSeconds: 60,
  allowPrebids: true,
  suddenDeath: false,
});

export function SaleTypePicker({
  value,
  onChange,
}: {
  value: SaleType;
  onChange: (v: SaleType) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <Label>Sale type</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            { key: "buy_now" as const, title: "Buy Now", body: "Fixed price checkout." },
            { key: "auction" as const, title: "Auction", body: "Live countdown with max bids." },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={cn(
              "rounded-lg border border-border p-3 text-left",
              value === opt.key && "border-primary bg-primary/5",
            )}
          >
            <span className="block font-medium">{opt.title}</span>
            <span className="text-sm text-muted-foreground">{opt.body}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function AuctionFields({
  state,
  onChange,
}: {
  state: AuctionFieldState;
  onChange: (patch: Partial<AuctionFieldState>) => void;
}) {
  if (state.saleType !== "auction") return null;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">
        Auction items run live in your shop room. Buyers place max bids and PopUp handles the
        countdown.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="auction_starting_bid">Starting bid (USD)</Label>
          <Input
            id="auction_starting_bid"
            name="auction_starting_bid"
            type="number"
            min={0.5}
            step="0.01"
            required
            value={state.startingBid}
            onChange={(e) => onChange({ startingBid: e.target.value })}
            placeholder="20.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="auction_min_increment">Minimum increment (USD)</Label>
          <Input
            id="auction_min_increment"
            name="auction_min_increment"
            type="number"
            min={0.5}
            step="0.01"
            required
            value={state.minIncrement}
            onChange={(e) => onChange({ minIncrement: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="auction_duration_seconds">Duration</Label>
        <select
          id="auction_duration_seconds"
          name="auction_duration_seconds"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={state.durationSeconds}
          onChange={(e) => onChange({ durationSeconds: Number(e.target.value) })}
        >
          {AUCTION_DURATION_PRESETS.map((p) => (
            <option key={p.seconds} value={p.seconds}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="auction_allow_prebids"
          checked={state.allowPrebids}
          onChange={(e) => onChange({ allowPrebids: e.target.checked })}
        />
        Allow pre-bids before the auction goes live
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="auction_sudden_death"
          checked={state.suddenDeath}
          onChange={(e) => onChange({ suddenDeath: e.target.checked })}
        />
        Sudden death (no timer extension — advanced)
      </label>
    </div>
  );
}
