import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Share2, Radio, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "From idea to sold-out drop in five steps. See how creators run timed pop-up shops with live auctions on PopUp.",
};

type Step = {
  n: string;
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  alt: string;
  chips: { icon: React.ReactNode; label: string }[];
};

const STEPS: Step[] = [
  {
    n: "01",
    eyebrow: "Dream it up",
    title: "Pick what you’ll drop — and when.",
    body: "Every PopUp shop is an event with a start and an end. Choose a window that fits your moment: a one-hour flash, an evening, or a weekend. The countdown creates the urgency, so the scarcity markets itself.",
    image: "/marketing/sell-step-plan.webp",
    alt: "Creator planning a drop with a notebook and calendar in a sunlit home studio",
    chips: [{ icon: <Clock className="size-4" />, label: "Timed open & close" }],
  },
  {
    n: "02",
    eyebrow: "Set the stage",
    title: "Style your shop and price your pieces.",
    body: "Add your products with photos and prices, then decide how each one sells — a simple Buy Now price, or a live auction with max bids and anti-snipe extensions. Build the lineup once; it’s ready the moment you open.",
    image: "/marketing/sell-step-setup.webp",
    alt: "Creator photographing and arranging handmade products under a studio light",
    chips: [{ icon: <Clock className="size-4" />, label: "Buy Now or live auctions" }],
  },
  {
    n: "03",
    eyebrow: "Spread the word",
    title: "Share one link with your people.",
    body: "Post your shop link anywhere your audience already is — Instagram, TikTok, Discord, or a group text. Fans tap in, join the waiting room, and get a reminder right before you go live. No marketplace browsing required.",
    image: "/marketing/sell-step-share.webp",
    alt: "Creator sharing their shop link from a phone with social engagement around her",
    chips: [{ icon: <Share2 className="size-4" />, label: "One shareable link" }],
  },
  {
    n: "04",
    eyebrow: "Showtime",
    title: "Go live and sell in the moment.",
    body: "When the clock hits zero, the doors open. Stream, chat with the room, and run flash deals and live auctions as the energy builds. Buyers check out instantly — and inventory holds mean you’ll never oversell.",
    image: "/marketing/sell-step-golive.webp",
    alt: "Creator going live on camera presenting a product with a ring light",
    chips: [{ icon: <Radio className="size-4" />, label: "Live stream, chat & flash drops" }],
  },
  {
    n: "05",
    eyebrow: "Cash in",
    title: "Get paid — then plan the next one.",
    body: "Stripe handles checkout and payouts, so the money lands in your account. After the drop, your report shows what sold, who showed up, and what to do differently. Tap a button and schedule the encore.",
    image: "/marketing/sell-step-payout.webp",
    alt: "Creator happily packing orders into shipping boxes with a sales dashboard nearby",
    chips: [{ icon: <Wallet className="size-4" />, label: "Stripe payouts + drop report" }],
  },
];

export default function SellPage() {
  return (
    <div className="overflow-hidden">
      {/* Intro */}
      <section className="relative mx-auto max-w-5xl px-4 pb-10 pt-16 text-center sm:pt-24">
        <p className="animate-fade-up mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          How it works
        </p>
        <h1 className="animate-fade-up animate-fade-up-delay-1 text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
          From idea to{" "}
          <span className="text-gradient-brand">sold-out drop</span>, in five steps.
        </h1>
        <p className="animate-fade-up animate-fade-up-delay-2 mx-auto mt-5 max-w-xl text-pretty text-muted-foreground sm:text-lg">
          PopUp turns a quiet idea into a live shopping event your audience shows up for. Here’s
          how a drop comes together.
        </p>
        <div className="animate-fade-up animate-fade-up-delay-3 mt-8 flex justify-center">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href="/signup">
              Create your shop
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Story steps */}
      <div className="mx-auto max-w-6xl px-4">
        {STEPS.map((step, i) => (
          <StepSection key={step.n} step={step} flip={i % 2 === 1} />
        ))}
      </div>

      {/* Closing CTA */}
      <section className="mx-auto mb-20 mt-6 max-w-5xl px-4">
        <div className="relative overflow-hidden rounded-3xl px-6 py-16 text-center text-white sm:px-12 sm:py-20">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#ff3b8b] via-[#a21caf] to-[#4c1d95]" />
          <div
            aria-hidden
            className="animate-drift absolute -z-10 left-1/2 top-1/2 h-[130%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur-3xl"
          />
          <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            Your first drop is closer than you think.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-pretty text-white/90">
            Create your shop, add a few pieces, and share the link when you’re ready. The
            countdown does the rest.
          </p>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="group mt-8 rounded-full border-white/40 bg-white px-8 text-primary shadow-lg shadow-black/20 transition-[transform,box-shadow] hover:scale-105 hover:bg-white hover:shadow-xl hover:shadow-primary/30"
          >
            <Link href="/signup">
              Create shop
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function StepSection({ step, flip }: { step: Step; flip: boolean }) {
  return (
    <section className="flex min-h-[78vh] items-center py-12">
      <div className="grid w-full items-center gap-8 lg:grid-cols-2 lg:gap-16">
        {/* Image */}
        <div className={cn("relative", flip && "lg:order-2")}>
          <div
            aria-hidden
            className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 via-accent/10 to-highlight/15 blur-2xl"
          />
          <div className="relative aspect-[3/2] overflow-hidden rounded-3xl border border-border/60 shadow-2xl shadow-black/20">
            <Image
              src={step.image}
              alt={step.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority={step.n === "01"}
            />
          </div>
          <span className="absolute -left-3 -top-3 flex size-14 items-center justify-center rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground shadow-lg shadow-primary/30 sm:-left-5 sm:-top-5 sm:size-16 sm:text-2xl">
            {step.n}
          </span>
        </div>

        {/* Copy */}
        <div className={cn(flip && "lg:order-1")}>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            {step.eyebrow}
          </p>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            {step.title}
          </h2>
          <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {step.body}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {step.chips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-sm font-medium text-foreground/80 [&_svg]:text-primary"
              >
                {chip.icon}
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
