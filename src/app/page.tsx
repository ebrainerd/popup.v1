import Link from "next/link";
import { Store, Bell, Zap, ArrowRight, Sparkles, Radio } from "lucide-react";
import { getExploreShops } from "@/lib/shops";
import { ShopCard } from "@/components/shop-card";
import { Button } from "@/components/ui/button";
import { LiveTicker } from "@/components/live-ticker";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

export default async function HomePage() {
  const preview = (await getExploreShops("all", "popular")).slice(0, 6);
  const liveCount = preview.filter((s) => s.is_live || s.live_url).length;

  return (
    <>
      <LiveTicker />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <section className="relative mb-14 overflow-hidden rounded-3xl px-6 py-16 text-center text-white sm:px-12 sm:py-24">
          {/* Layered hero background */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#ff3b8b] via-[#a21caf] to-[#4c1d95]" />
          <div
            aria-hidden
            className="animate-drift absolute -z-10 left-1/2 top-1/2 h-[130%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30 blur-3xl"
          />
          <div
            aria-hidden
            className="animate-orb-2 absolute -z-10 -right-[10%] -top-[20%] h-48 w-48 rounded-full bg-accent/40 blur-2xl"
          />
          <div
            aria-hidden
            className="animate-orb-3 absolute -z-10 -bottom-[15%] -left-[5%] h-40 w-40 rounded-full bg-highlight/30 blur-2xl"
          />

          {/* Floating decorative icons */}
          <Sparkles
            aria-hidden
            className="animate-float absolute left-6 top-8 size-6 text-white/30 sm:left-12 sm:size-8"
          />
          <Radio
            aria-hidden
            className="animate-float absolute right-8 top-12 size-5 text-white/25 sm:right-16 sm:size-7"
            style={{ animationDelay: "1.5s" }}
          />
          <Zap
            aria-hidden
            className="animate-float absolute bottom-10 left-[15%] size-5 text-white/20 sm:size-6"
            style={{ animationDelay: "0.8s" }}
          />

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
              className="group rounded-full border-white/40 bg-white px-8 text-primary shadow-lg shadow-black/20 transition-[transform,box-shadow] hover:scale-105 hover:bg-white hover:shadow-xl hover:shadow-primary/30"
            >
              <Link href="/signup">
                Start your drop
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Link
              href="/explore"
              className="text-sm text-white/90 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Browse what&apos;s happening now ↓
            </Link>
          </div>

          {/* Quick stats */}
          <div className="animate-fade-up animate-fade-up-delay-4 mx-auto mt-10 flex max-w-md justify-center gap-6 sm:gap-10">
            <div className="text-center">
              <p className="text-2xl font-extrabold sm:text-3xl">{preview.length || "—"}</p>
              <p className="text-xs text-white/70 sm:text-sm">Shops live</p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-extrabold sm:text-3xl">{liveCount || "—"}</p>
              <p className="text-xs text-white/70 sm:text-sm">Streaming now</p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-extrabold sm:text-3xl">⚡</p>
              <p className="text-xs text-white/70 sm:text-sm">Flash drops</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-14">
          <h2 className="animate-fade-up mb-6 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            How it works
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className={cn(
                  "animate-fade-up glass-card group rounded-2xl p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none",
                  FADE_DELAYS[i],
                )}
              >
                <div
                  className={`mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent} text-primary transition-transform duration-300 group-hover:scale-110`}
                >
                  {step.icon}
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Happening Now preview */}
        <section>
          <div className="animate-fade-up mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Radio className="size-4" />
              </span>
              <h2 className="text-2xl font-bold">
                Happening <span className="text-gradient-brand">Now</span>
              </h2>
            </div>
            <Link
              href="/explore"
              className="group inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Explore all
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {preview.length === 0 ? (
            <div className="glass-card rounded-2xl border-dashed p-12 text-center">
              <Sparkles className="mx-auto mb-3 size-8 text-primary/60" />
              <p className="text-muted-foreground">No open shops yet. The next drop could be yours.</p>
              <Button asChild className="mt-4 rounded-full">
                <Link href="/signup">Start a drop</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {preview.map((shop, i) => (
                <div key={shop.id} className={cn("animate-fade-up", FADE_DELAYS[Math.min(i, 4)])}>
                  <ShopCard shop={shop} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
