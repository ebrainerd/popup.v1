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
import { getCurrentUser } from "@/lib/auth";
import { createShopPath } from "@/lib/auth-routes";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: Package,
    title: "Add your products",
    body: "Upload photos, set prices, and choose Buy Now or live auction for each piece.",
  },
  {
    icon: Palette,
    title: "Make it yours",
    body: "Customize your shop layout so it feels like your brand, not a generic storefront.",
  },
  {
    icon: CalendarClock,
    title: "Schedule your drop",
    body: "Pick when your shop opens and closes. The countdown builds the hype for you.",
  },
  {
    icon: Radio,
    title: "Connect with your audience",
    body: "Go live from the app, or embed your Twitch or YouTube stream. Chat and sell in the same room.",
  },
  {
    icon: Share2,
    title: "Send your invites",
    body: "Share one link anywhere your people already are. They join the waiting room and get reminded before you open.",
  },
  {
    icon: Store,
    title: "Open for business!",
    body: "When the clock hits zero, the doors open. Run flash sales, live auctions, and checkout, all in one place.",
  },
] as const;

export async function InviteOnlyHomePage() {
  const user = await getCurrentUser();
  const createShopHref = createShopPath(Boolean(user));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <section className="bg-brand-gradient relative mb-6 overflow-hidden rounded-3xl px-6 py-20 text-center text-white sm:px-12 sm:py-28">
        <h1 className="mx-auto max-w-3xl text-balance text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-7xl">
          Pop up. Sell out.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-white/85 sm:text-xl">
          Everything you need to run a timed pop-up shop, in one link.
        </p>

        <div className="mt-9 flex justify-center">
          <Button
            asChild
            size="lg"
            className="group rounded-full bg-white px-8 text-base text-primary shadow-lg shadow-black/30 hover:bg-white"
          >
            <Link href={createShopHref}>
              Create shop
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>

      <p className="mb-20 text-center text-sm text-muted-foreground">
        Got a creator&apos;s PopUp link? Open it directly to join their drop.
      </p>

      <section id="how-it-works" className="mb-20 scroll-mt-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            From setup to sold out in six simple steps.
          </p>
        </div>

        <div className="space-y-6">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <article
                key={step.title}
                className="flex gap-5 rounded-2xl border border-border/60 bg-card/50 p-6 sm:gap-6 sm:p-8"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-primary">
                  <Icon className="size-5" />
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

      <section className="rounded-3xl border border-border/60 bg-card/50 px-6 py-12 text-center sm:px-10 sm:py-14">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to open your shop?</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Add your products, set your schedule, and share your link when you&apos;re ready.
        </p>
        <Button asChild size="lg" className="mt-6 rounded-full px-8">
          <Link href={createShopHref}>
            Create shop
            <ArrowRight />
          </Link>
        </Button>
      </section>
    </div>
  );
}
