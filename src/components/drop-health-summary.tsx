import { Bell, Clock, Package, Users } from "lucide-react";
import type { DropHealth } from "@/lib/drop-readiness";

export function DropHealthSummary({
  health,
  isEnded = false,
}: {
  health: DropHealth;
  isEnded?: boolean;
}) {
  const opensAt = new Date(health.openingAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-4">
      <Stat icon={Bell} label="Waitlist" value={String(health.reminderCount)} />
      <Stat icon={Users} label="Followers" value={String(health.followerCount)} />
      <Stat
        icon={Package}
        label="Units left"
        value={String(health.availableUnits)}
        hint={`${health.productCount} product${health.productCount === 1 ? "" : "s"}`}
      />
      <Stat
        icon={Clock}
        label={isEnded ? "Opened" : "Opens"}
        value={opensAt}
        compact
      />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  compact,
}: {
  icon: typeof Bell;
  label: string;
  value: string;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-card/60 px-2.5 py-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={compact ? "text-sm font-semibold leading-snug" : "text-lg font-bold tabular-nums"}>
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
