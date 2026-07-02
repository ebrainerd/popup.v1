import { Zap, Radio, Timer, Gavel, Link2, PartyPopper } from "lucide-react";

const ITEMS = [
  { icon: Timer, label: "Countdown hype" },
  { icon: Zap, label: "Flash drops" },
  { icon: Radio, label: "Go live" },
  { icon: Gavel, label: "Live auctions" },
  { icon: Link2, label: "One link" },
  { icon: PartyPopper, label: "Sold out" },
] as const;

/**
 * Single kinetic marquee strip between the hero and the walkthrough.
 * Pure CSS (`.animate-ticker`), duplicated content for a seamless loop,
 * static under prefers-reduced-motion.
 */
export function LandingMarquee() {
  return (
    <div className="relative overflow-hidden border-y border-border/60 bg-card/40 py-4">
      <div className="animate-ticker flex w-max items-center">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy === 1}
            className="flex shrink-0 items-center gap-10 pr-10"
          >
            {ITEMS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-muted-foreground"
              >
                <Icon className="size-4 text-primary" />
                {label}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
