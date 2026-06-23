const TICKER_ITEMS = [
  "⚡ Flash drops",
  "🔴 Live now",
  "⏱️ Limited windows",
  "🛍️ Catch it before it's gone",
  "✨ New creators daily",
  "🎯 Follow your favorites",
  "💫 Real moments, real goods",
  "🚀 Start your drop",
];

export function LiveTicker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div
      className="relative overflow-hidden border-b border-border/60 bg-muted/40 py-2 backdrop-blur-sm"
      aria-hidden
    >
      <div className="animate-ticker flex w-max gap-8 whitespace-nowrap px-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary animate-live-pulse" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
