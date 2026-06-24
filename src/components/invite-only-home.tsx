import Link from "next/link";
import {
  Store,
  Link2,
  Clock,
  Zap,
  ArrowRight,
  Sparkles,
  Megaphone,
  BarChart3,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FADE_DELAYS = [
  "animate-fade-up-delay-1",
  "animate-fade-up-delay-2",
  "animate-fade-up-delay-3",
  "animate-fade-up-delay-4",
  "animate-fade-up-delay-5",
] as const;

const CAPABILITIES = [
  {
    icon: <Clock className="size-5" />,
    title: "Timed drops",
    body: "Set when your shop opens and closes — scarcity is built in.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    icon: <Link2 className="size-5" />,
    title: "One shareable link",
    body: "Post your shop link anywhere — Instagram, TikTok, Discord, or text.",
    accent: "from-accent/20 to-accent/5",
  },
  {
    icon: <Megaphone className="size-5" />,
    title: "Waiting room",
    body: "Buyers join the waitlist, see announcements, and show up when you open.",
    accent: "from-highlight/25 to-highlight/5",
  },
  {
    icon: <Zap className="size-5" />,
    title: "Flash drops",
    body: "Run limited flash pricing live in the room while the clock ticks.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    icon: <Truck className="size-5" />,
    title: "Checkout & fulfillment",
    body: "Stripe checkout, inventory holds, shipping updates, and order emails.",
    accent: "from-accent/20 to-accent/5",
  },
  {
    icon: <BarChart3 className="size-5" />,
    title: "Post-drop report",
    body: "See sales, sell-through, waitlist signups, and schedule your next drop.",
    accent: "from-highlight/25 to-highlight/5",
  },
];

export function InviteOnlyHomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="relative mb-14 overflow-hidden rounded-3xl px-6 py-16 text-center text-white sm:px-12 sm:py-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#ff3b8b] via-[#a21caf] to-[#4c1d95]" />
        <div
          aria-hidden
          className="animate-drift absolute -z-10 left-1/2 top-1/2 h-[130%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30 blur-3xl"
        />

        <p className="animate-fade-up mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
          <Store className="size-3.5" />
          Partiful for online pop-up shops
        </p>

        <h1 className="animate-fade-up animate-fade-up-delay-1 mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          Online pop-up shops in one link.
        </h1>

        <p className="animate-fade-up animate-fade-up-delay-2 mx-auto mt-5 max-w-xl text-pretty text-white/90 sm:text-lg">
          Create a timed shop, share it anywhere, go live, and sell before the clock runs out.
        </p>

        <div className="animate-fade-up animate-fade-up-delay-3 mt-8 flex flex-col items-center gap-3">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="group rounded-full border-white/40 bg-white px-8 text-primary shadow-lg shadow-black/20 transition-[transform,box-shadow] hover:scale-105 hover:bg-white hover:shadow-xl hover:shadow-primary/30"
          >
            <Link href="/signup">
              Create a pop-up shop
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Link
            href="/sell"
            className="text-sm text-white/90 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            See how PopUp shops work →
          </Link>
        </div>

        <p className="animate-fade-up animate-fade-up-delay-4 mx-auto mt-8 max-w-md text-sm text-white/80">
          Got a creator&apos;s PopUp link? Open it directly to join their drop.
        </p>
      </section>

      <section className="mb-14">
        <h2 className="animate-fade-up mb-6 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Everything you need to run a drop
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((item, i) => (
            <div
              key={item.title}
              className={cn(
                "animate-fade-up glass-card group rounded-2xl p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none",
                FADE_DELAYS[Math.min(i, 4)],
              )}
            >
              <div
                className={`mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-primary transition-transform duration-300 group-hover:scale-110`}
              >
                {item.icon}
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="animate-fade-up glass-card rounded-2xl border-dashed p-10 text-center">
        <Sparkles className="mx-auto mb-3 size-8 text-primary/60" />
        <h2 className="text-xl font-bold">Bring your own audience</h2>
        <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
          PopUp is invite-link first while we onboard selected creators. Share your shop link
          wherever your people already are — no marketplace browsing required.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link href="/signup">Create shop</Link>
        </Button>
      </section>
    </div>
  );
}
