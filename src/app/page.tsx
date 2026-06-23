import Link from "next/link";
import { Store, Bell, Zap, ArrowRight, Sparkles } from "lucide-react";
import { getExploreShops } from "@/lib/shops";
import { ShopCard } from "@/components/shop-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    icon: <Store className="size-5" />,
    title: "Creators open a timed shop",
    body: "Set a start and end — the shop opens and closes on the clock.",
  },
  {
    icon: <Bell className="size-5" />,
    title: "Buyers discover & follow",
    body: "Browse what's happening now and get notified when favorites go live.",
  },
  {
    icon: <Zap className="size-5" />,
    title: "Shop live & catch flash drops",
    body: "Join the room, chat, and grab flash drops before the countdown ends.",
  },
];

// Decorative sparkles scattered around the hero (position / delay / size).
const SPARKLES = [
  { top: "12%", left: "8%", size: 18, delay: "0s" },
  { top: "22%", left: "88%", size: 14, delay: "0.6s" },
  { top: "68%", left: "14%", size: 12, delay: "1.2s" },
  { top: "78%", left: "82%", size: 20, delay: "0.3s" },
  { top: "44%", left: "94%", size: 12, delay: "1.6s" },
  { top: "8%", left: "60%", size: 12, delay: "2s" },
];

const MARQUEE_WORDS = [
  "flash drops",
  "live rooms",
  "limited windows",
  "real moments",
  "follow creators",
  "instant checkout",
  "catch it or miss it",
];

export default async function HomePage() {
  const preview = (await getExploreShops("all", "popular")).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero */}
      <section className="relative mb-12 overflow-hidden rounded-2xl px-6 py-16 text-center text-white sm:px-12 sm:py-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#ff3b8b] via-[#a21caf] to-[#4c1d95]" />
        {/* Two drifting lights moving on different paths for a lively glow. */}
        <div
          aria-hidden
          className="animate-drift absolute -z-10 left-1/2 top-1/2 h-[120%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-blob-c absolute -z-10 right-0 top-0 h-[80%] w-[45%] rounded-full bg-[#00e6c8]/30 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-blob-a absolute -z-10 bottom-0 left-0 h-[80%] w-[45%] rounded-full bg-[#ffd60a]/25 blur-3xl"
        />

        {/* Twinkling sparkles */}
        {SPARKLES.map((s, i) => (
          <Sparkles
            key={i}
            aria-hidden
            className="animate-twinkle pointer-events-none absolute text-white/80"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
            }}
          />
        ))}

        <div className="animate-reveal-up mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="animate-live-pulse absolute inline-flex h-full w-full rounded-full bg-[#ffd60a]" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ffd60a]" />
          </span>
          Live drops happening now
        </div>

        <h1 className="animate-reveal-up reveal-delay-1 mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          <span className="inline-block">Shops that open and close</span>{" "}
          <span className="text-gradient-animate inline-block">on the clock.</span>
        </h1>
        <p className="animate-reveal-up reveal-delay-2 mx-auto mt-5 max-w-xl text-pretty text-white/90 sm:text-lg">
          Limited windows. Real moments. Follow creators and catch their drops before they vanish.
        </p>
        <div className="animate-reveal-up reveal-delay-3 mt-8 flex flex-col items-center gap-3">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-full border-white/40 bg-white px-8 text-primary shadow-lg shadow-black/20 hover:bg-white/90"
          >
            <Link href="/signup">
              Start your drop <Zap className="size-4 fill-current" />
            </Link>
          </Button>
          <Link href="/explore" className="text-sm text-white/90 underline-offset-4 hover:underline">
            Browse what&apos;s happening now ↓
          </Link>
        </div>
      </section>

      {/* Marquee strip of fun words */}
      <section
        aria-hidden
        className="animate-reveal-up reveal-delay-2 mb-12 overflow-hidden rounded-full border border-border bg-card/60 py-3 backdrop-blur"
      >
        <div className="animate-marquee flex w-max items-center gap-6 whitespace-nowrap pr-6 text-sm font-semibold text-muted-foreground">
          {[...MARQUEE_WORDS, ...MARQUEE_WORDS].map((word, i) => (
            <span key={i} className="flex items-center gap-6">
              <span className="text-foreground/80">{word}</span>
              <Sparkles className="size-3.5 text-primary" />
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mb-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className={`animate-reveal-up reveal-delay-${i + 1} group rounded-lg border border-border bg-card/80 p-5 backdrop-blur transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lg`}
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform duration-200 group-hover:scale-110">
                {step.icon}
              </div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Happening Now preview */}
      <section>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">
            Happening <span className="text-gradient-animate">Now</span>
          </h2>
          <Link
            href="/explore"
            className="group inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Explore all{" "}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {preview.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">No open shops yet. The next drop could be yours.</p>
            <Button asChild className="mt-4 rounded-full">
              <Link href="/signup">Start a drop</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((shop, i) => (
              <div
                key={shop.id}
                className={`animate-reveal-up reveal-delay-${Math.min(i + 1, 5)}`}
              >
                <ShopCard shop={shop} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
