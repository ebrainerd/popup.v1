import Link from "next/link";
import { Store, Bell, Zap, ArrowRight } from "lucide-react";
import { getUpcomingDrops, getOpenShops } from "@/lib/shops";
import { ShopCard } from "@/components/shop-card";
import { Button } from "@/components/ui/button";
import { LiveTicker } from "@/components/live-ticker";
import { cn } from "@/lib/utils";

const FADE_DELAYS = [
  "animate-fade-up-delay-1",
  "animate-fade-up-delay-2",
  "animate-fade-up-delay-3",
  "animate-fade-up-delay-4",
  "animate-fade-up-delay-5",
] as const;

const STEPS = [
  {
    icon: <Store className="size-5" />,
    title: "Creators open a timed shop",
    body: "Set a start and end — the shop opens and closes on the clock.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    icon: <Bell className="size-5" />,
    title: "Buyers discover & follow",
    body: "Browse what's happening now and get notified when favorites go live.",
    accent: "from-accent/20 to-accent/5",
  },
  {
    icon: <Zap className="size-5" />,
    title: "Shop live & catch flash drops",
    body: "Join the room, chat, and grab flash drops before the countdown ends.",
    accent: "from-highlight/25 to-highlight/5",
  },
];

export async function MarketplaceHomePage() {
  const [upcoming, liveNow] = await Promise.all([getUpcomingDrops(6), getOpenShops(6)]);
  const liveCount = liveNow.filter((s) => s.is_live || s.live_url).length;

  return (
    <>
      <LiveTicker />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="relative mb-14 overflow-hidden rounded-3xl px-6 py-16 text-center text-white sm:px-12 sm:py-24">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#ff3b8b] via-[#a21caf] to-[#4c1d95]" />
          <p className="animate-fade-up mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
            <span className="size-2 rounded-full bg-white animate-live-pulse" />
            The night market is open
          </p>
          <h1 className="animate-fade-up animate-fade-up-delay-1 mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            <span className="inline-block">Shops that open and close</span>{" "}
            <span className="inline-block bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
              on the clock.
            </span>
          </h1>
          <p className="animate-fade-up animate-fade-up-delay-2 mx-auto mt-5 max-w-xl text-pretty text-white/90 sm:text-lg">
            Limited windows. Real moments. Follow creators and catch their drops before they vanish.
          </p>
          <div className="animate-fade-up animate-fade-up-delay-3 mt-8 flex flex-col items-center gap-3">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="group rounded-full border-white/40 bg-white px-8 text-primary shadow-lg shadow-black/20"
            >
              <Link href="/signup">
                Start your drop
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Link href="/explore" className="text-sm text-white/90 hover:underline">
              Browse what&apos;s happening now ↓
            </Link>
          </div>
          <div className="animate-fade-up animate-fade-up-delay-4 mx-auto mt-10 flex max-w-md justify-center gap-6 sm:gap-10">
            <div className="text-center">
              <p className="text-2xl font-extrabold sm:text-3xl">{upcoming.length || "—"}</p>
              <p className="text-xs text-white/70 sm:text-sm">Upcoming drops</p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-extrabold sm:text-3xl">{liveCount || "—"}</p>
              <p className="text-xs text-white/70 sm:text-sm">Live now</p>
            </div>
          </div>
        </section>

        <section className="mb-14">
          <h2 className="animate-fade-up mb-6 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            How it works
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className={cn(
                  "animate-fade-up glass-card rounded-2xl p-6",
                  FADE_DELAYS[i],
                )}
              >
                <div
                  className={`mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent} text-primary`}
                >
                  {step.icon}
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">
              Upcoming <span className="text-gradient-brand">Drops</span>
            </h2>
            <Link href="/explore?tab=soon" className="text-sm font-medium text-primary hover:underline">
              See all
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="glass-card rounded-2xl border-dashed p-12 text-center text-muted-foreground">
              No drops scheduled yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((shop) => (
                <ShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">
              Live <span className="text-gradient-brand">Now</span>
            </h2>
            <Link href="/explore" className="text-sm font-medium text-primary hover:underline">
              Explore all
            </Link>
          </div>
          {liveNow.length === 0 ? (
            <div className="glass-card rounded-2xl border-dashed p-12 text-center text-muted-foreground">
              Nothing live right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveNow.map((shop) => (
                <ShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
