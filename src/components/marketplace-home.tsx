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
    body: "Set a start and end. The shop opens and closes on the clock.",
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
        <section className="bg-brand-gradient relative mb-14 overflow-hidden rounded-3xl px-6 py-20 text-center text-white sm:px-12 sm:py-28">
          <h1 className="animate-fade-up mx-auto max-w-3xl text-balance text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-7xl">
            <span className="inline-block">Shops that open and close</span>{" "}
            <span className="inline-block text-highlight">on the clock.</span>
          </h1>
          <p className="animate-fade-up animate-fade-up-delay-1 mx-auto mt-6 max-w-xl text-pretty text-white/85 sm:text-lg">
            Limited windows. Real moments. Follow creators and catch their drops before they vanish.
          </p>
          <div className="animate-fade-up animate-fade-up-delay-2 mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="group rounded-full bg-white px-8 text-base text-primary shadow-lg shadow-black/30 hover:bg-white"
            >
              <Link href="/signup">
                Start a Drop
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Link href="/explore" className="text-sm font-medium text-white/90 hover:text-white hover:underline">
              Browse what&apos;s happening now
            </Link>
          </div>
          <div className="animate-fade-up animate-fade-up-delay-3 mx-auto mt-10 flex max-w-md justify-center gap-6 sm:gap-10">
            <div className="text-center">
              <p className="text-2xl font-extrabold sm:text-3xl">{upcoming.length || "0"}</p>
              <p className="text-xs text-white/70 sm:text-sm">Upcoming drops</p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-extrabold sm:text-3xl">{liveCount || "0"}</p>
              <p className="text-xs text-white/70 sm:text-sm">Live now</p>
            </div>
          </div>
        </section>

        <section className="mb-14">
          <h2 className="animate-fade-up mb-6 text-center text-2xl font-bold tracking-tight">
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
