import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Share2, Radio, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createShopPath } from "@/lib/auth-routes";
import { Button } from "@/components/ui/button";
import { BRAND_TAGLINE, BRAND_TAGLINE_PAIRING } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How it works",
  description: `${BRAND_TAGLINE} ${BRAND_TAGLINE_PAIRING} See how creators run a drop in five steps.`,
};

type Step = {
  title: string;
  body: string;
  image: string;
  alt: string;
  chip: { icon: React.ReactNode; label: string };
};

const STEPS: Step[] = [
  {
    title: "Pick what you’ll drop, and when.",
    body: "Every PopUp shop is an event with a start and an end. Choose a window that fits your moment: a one-hour flash, an evening, or a weekend. The countdown creates the urgency, so the scarcity markets itself.",
    image: "/marketing/sell-step-plan.webp",
    alt: "Creator planning a drop with a notebook and calendar in a sunlit home studio",
    chip: { icon: <Clock className="size-4" />, label: "Timed open & close" },
  },
  {
    title: "Style your shop and price your pieces.",
    body: "Add products with photos and prices, then decide how each one sells: a simple Buy Now price, or a live auction with max bids and anti-snipe extensions. Build the lineup once; it is ready the moment you open.",
    image: "/marketing/sell-step-setup.webp",
    alt: "Creator photographing and arranging handmade products under a studio light",
    chip: { icon: <Clock className="size-4" />, label: "Buy Now or live auctions" },
  },
  {
    title: "Share one link with your people.",
    body: "Post your shop link anywhere your audience already is: Instagram, TikTok, Discord, or a group text. Fans tap in, join the waiting room, and get a reminder right before you go live. No marketplace browsing required.",
    image: "/marketing/sell-step-share.webp",
    alt: "Creator sharing their shop link from a phone with social engagement around her",
    chip: { icon: <Share2 className="size-4" />, label: "One shareable link" },
  },
  {
    title: "Go live and sell in the moment.",
    body: "When the clock hits zero, the doors open. Stream, chat with the room, and run flash deals and live auctions as the energy builds. Buyers check out instantly, and inventory holds mean you will never oversell.",
    image: "/marketing/sell-step-golive.webp",
    alt: "Creator going live on camera presenting a product with a ring light",
    chip: { icon: <Radio className="size-4" />, label: "Live stream, chat & flash drops" },
  },
  {
    title: "Get paid, then plan the next one.",
    body: "Stripe handles checkout and payouts, so the money lands in your account. After the drop, your report shows what sold, who showed up, and what to do differently. Tap a button and schedule the encore.",
    image: "/marketing/sell-step-payout.webp",
    alt: "Creator happily packing orders into shipping boxes with a sales dashboard nearby",
    chip: { icon: <Wallet className="size-4" />, label: "Stripe payouts + drop report" },
  },
];

export default async function SellPage() {
  const user = await getCurrentUser();
  const createShopHref = createShopPath(Boolean(user));

  return (
    <div className="overflow-hidden">
      {/* Intro */}
      <section className="relative mx-auto max-w-5xl px-4 pb-12 pt-16 text-center sm:pt-24">
        <h1 className="animate-fade-up text-balance text-5xl font-extrabold tracking-tight sm:text-7xl">
          From idea to{" "}
          <span className="text-gradient-brand">sold-out drop</span>, in five steps.
        </h1>
        <p className="animate-fade-up animate-fade-up-delay-1 mx-auto mt-6 max-w-xl text-pretty text-muted-foreground sm:text-lg">
          PopUp turns a quiet idea into a live shopping event your audience shows up for. Here is
          how a drop comes together.
        </p>
        <div className="animate-fade-up animate-fade-up-delay-2 mt-8 flex justify-center">
          <Button asChild size="lg" className="group rounded-full px-8">
            <Link href={createShopHref}>
              Create shop
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Steps: image-forward cards. Four in a 2-col grid, the finale spans
          full width so the grid has rhythm and exactly five cells. */}
      <section className="mx-auto max-w-6xl px-4 pb-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <StepCard key={step.image} step={step} wide={i === STEPS.length - 1} />
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto mb-20 mt-8 max-w-5xl px-4">
        <div className="bg-brand-gradient relative overflow-hidden rounded-3xl px-6 py-16 text-center text-white sm:px-12 sm:py-20">
          <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
            Your first drop is closer than you think.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-white/85">
            Add a few pieces, set your schedule, and share the link when you are ready. The
            countdown does the rest.
          </p>
          <Button
            asChild
            size="lg"
            className="group mt-8 rounded-full bg-white px-8 text-base text-primary shadow-lg shadow-black/30 hover:bg-white"
          >
            <Link href={createShopHref}>
              Create shop
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function StepCard({ step, wide }: { step: Step; wide?: boolean }) {
  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card/50",
        wide && "sm:col-span-2 sm:flex-row",
      )}
    >
      <div className={cn("relative aspect-[3/2] w-full overflow-hidden", wide && "sm:aspect-auto sm:w-1/2")}>
        <Image
          src={step.image}
          alt={step.alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className={cn("flex flex-1 flex-col p-6 sm:p-8", wide && "sm:justify-center")}>
        <h2 className="text-balance text-xl font-bold tracking-tight sm:text-2xl">{step.title}</h2>
        <p className="mt-3 max-w-prose text-pretty leading-relaxed text-muted-foreground">
          {step.body}
        </p>
        <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm font-medium text-foreground/80 [&_svg]:text-primary">
          {step.chip.icon}
          {step.chip.label}
        </span>
      </div>
    </article>
  );
}
