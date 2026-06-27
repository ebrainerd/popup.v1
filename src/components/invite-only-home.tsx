import Link from "next/link";
import {
  Package,
  Palette,
  CalendarClock,
  Radio,
  Share2,
  Store,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroScrollButton } from "@/components/hero-scroll-button";

const STEPS = [
  {
    n: "01",
    icon: Package,
    title: "Add your products",
    body: "Upload photos, set prices, and choose Buy Now or live auction for each piece.",
  },
  {
    n: "02",
    icon: Palette,
    title: "Make it yours",
    body: "Customize your shop layout so it feels like your brand — not a generic storefront.",
  },
  {
    n: "03",
    icon: CalendarClock,
    title: "Schedule your drop",
    body: "Pick when your shop opens and closes. The countdown builds the hype for you.",
  },
  {
    n: "04",
    icon: Radio,
    title: "Connect with your audience",
    body: "Go live from the app, or embed your Twitch or YouTube stream. Chat and sell in the same room.",
  },
  {
    n: "05",
    icon: Share2,
    title: "Send your invites",
    body: "Share one link anywhere your people already are. They join the waiting room and get reminded before you open.",
  },
  {
    n: "06",
    icon: Store,
    title: "Open for business!",
    body: "When the clock hits zero, the doors open. Run flash sales, live auctions, and checkout — all in one place.",
  },
] as const;

export function InviteOnlyHomePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <section className="relative mb-20 overflow-hidden rounded-3xl px-6 py-16 text-center text-white sm:px-12 sm:py-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#ff3b8b] via-[#a21caf] to-[#4c1d95]" />
        <div
          aria-hidden
          className="absolute -z-10 left-1/2 top-1/2 h-[130%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur-3xl"
        />

        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          Pop up. Sell out.
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-white/90 sm:text-xl">
          Everything you need to run a timed pop-up shop — in one link.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="group rounded-full border-white/40 bg-white px-8 text-primary shadow-lg shadow-black/20 transition-[transform,box-shadow] hover:scale-[1.02] hover:bg-white hover:shadow-xl hover:shadow-primary/30"
          >
            <Link href="/signup">
              Create your shop
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        <HeroScrollButton targetId="how-it-works" />

        <p className="mx-auto mt-8 max-w-md text-sm text-white/75">
          Got a creator&apos;s PopUp link? Open it directly to join their drop.
        </p>
      </section>

      <section id="how-it-works" className="mb-20 scroll-mt-24">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            From setup to sold-out — six steps to your first drop.
          </p>
        </div>

        <div className="space-y-6">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <article
                key={step.n}
                className="flex gap-5 rounded-2xl border border-border/60 bg-card/50 p-6 sm:gap-6 sm:p-8"
              >
                <div className="flex shrink-0 flex-col items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {step.n}
                  </span>
                  <div className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-primary">
                    <Icon className="size-5" />
                  </div>
                </div>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-lg font-semibold tracking-tight sm:text-xl">{step.title}</h3>
                  <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/50 px-6 py-12 text-center sm:px-10 sm:py-14">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to open your shop?</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Create your shop, add your products, and share your link when you&apos;re ready.
        </p>
        <Button asChild size="lg" className="mt-6 rounded-full px-8">
          <Link href="/signup">
            Create your shop
            <ArrowRight />
          </Link>
        </Button>
      </section>
    </div>
  );
}
