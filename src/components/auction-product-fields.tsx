"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckboxWithHelp, LabelWithHelp } from "@/components/field-help";
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
          <LabelWithHelp
            htmlFor="auction_starting_bid"
            helpLabel="Starting bid"
            help={
              <>
                The lowest amount a buyer can win with. When you start the lot, bidding opens at
                this price. If only one person bids at the starting amount, they win at that price.
              </>
            }
          >
            Starting bid (USD)
          </LabelWithHelp>
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
          <LabelWithHelp
            htmlFor="auction_min_increment"
            helpLabel="Minimum increment"
            help={
              <>
                Each new bid must raise the visible price by at least this amount. Buyers enter a
                max bid in the background; PopUp only moves the displayed price up one increment at
                a time.
              </>
            }
          >
            Minimum increment (USD)
          </LabelWithHelp>
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
        <LabelWithHelp
          htmlFor="auction_duration_seconds"
          helpLabel="Countdown length"
          help={
            <>
              How long the on-screen timer runs after you press Start auction. When it reaches
              zero, the highest bidder wins. By default, a bid in the last 10 seconds adds 10 more
              seconds so buyers can respond — turn on Sudden death to disable that extension.
            </>
          }
        >
          Countdown length
        </LabelWithHelp>
        <select
          id="auction_duration_seconds"
          name="auction_duration_seconds"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
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

      <CheckboxWithHelp
        id="auction_allow_prebids"
        name="auction_allow_prebids"
        checked={state.allowPrebids}
        onChange={(allowPrebids) => onChange({ allowPrebids })}
        label="Allow pre-bids before the auction goes live"
        help={
          <>
            Buyers can set their max bid while the lot is queued. Those bids count the moment you
            start the auction — useful for building hype before you go live on camera.
          </>
        }
      />

      <CheckboxWithHelp
        id="auction_sudden_death"
        name="auction_sudden_death"
        checked={state.suddenDeath}
        onChange={(suddenDeath) => onChange({ suddenDeath })}
        label="Sudden death (no time extensions)"
        help={
          <>
            Normally, a bid in the final 10 seconds resets the clock to 10 seconds left so last-second
            bidders can respond. Sudden death turns that off: the auction ends exactly when the
            countdown hits zero, even if someone just bid. Most sellers leave this off; it is
            optional for fast, no-mercy lots.
          </>
        }
      />
    </div>
  );
}
