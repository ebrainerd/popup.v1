"use client";

import Image from "next/image";
import { Bell, MessageCircle, CreditCard, PackageCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const SMALL_CELLS = [
  {
    icon: Bell,
    title: "Waiting room & reminders",
    body: "Early birds wait together at your link and get pinged the moment you open.",
    tint: "from-primary/25 to-primary/5",
    iconClass: "text-primary",
  },
  {
    icon: MessageCircle,
    title: "Chat in the room",
    body: "Buyers hang out, hype each other up, and ask questions while you sell.",
    tint: "from-accent/20 to-accent/5",
    iconClass: "text-accent",
  },
  {
    icon: CreditCard,
    title: "Checkout built in",
    body: "Card payments powered by Stripe, paid out straight to your bank.",
    tint: "from-highlight/20 to-highlight/5",
    iconClass: "text-highlight",
  },
  {
    icon: PackageCheck,
    title: "Orders in one place",
    body: "See what sold, print who gets what, and mark orders shipped in a tap.",
    tint: "from-primary/15 to-accent/5",
    iconClass: "text-accent",
  },
] as const;

export function LandingFeatures() {
  const reduce = useReducedMotion();

  const reveal = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.6, delay, ease: EASE },
  });

  return (
    <section className="px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            The fun parts are built in
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-lg text-muted-foreground">
            You bring the products and the personality. PopUp handles the rest.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {/* Feature cell with a real image */}
          <motion.div
            {...reveal(0)}
            className="relative overflow-hidden rounded-3xl bg-[#14070d] text-white ring-1 ring-white/10 sm:col-span-2 lg:col-span-4"
          >
            <div className="relative z-10 max-w-sm p-8 sm:p-10">
              <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Flash drops & live auctions
              </h3>
              <p className="mt-3 text-pretty leading-relaxed text-white/70">
                Spike the energy mid-stream: drop a surprise price for 60
                seconds, or let your crowd bid it up in a live auction.
              </p>
            </div>
            <div className="relative -mt-4 h-56 sm:absolute sm:inset-y-0 sm:right-0 sm:mt-0 sm:h-auto sm:w-1/2">
              <Image
                src="/landing/feature_auction.webp"
                alt="A claymation teal auction gavel striking next to a big pink price tag with coins and lightning bolts flying"
                fill
                sizes="(min-width: 640px) 33vw, 92vw"
                className="object-cover object-right"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-[#14070d] via-transparent to-transparent sm:bg-gradient-to-r sm:from-[#14070d] sm:via-transparent sm:to-transparent"
              />
            </div>
          </motion.div>

          {SMALL_CELLS.map((cell, i) => {
            const Icon = cell.icon;
            return (
              <motion.div
                key={cell.title}
                {...reveal(0.08 * (i + 1))}
                className={`glass-card rounded-3xl p-7 lg:col-span-2 ${i === 0 ? "lg:row-start-1 lg:col-start-5" : ""}`}
              >
                <div
                  className={`mb-5 inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cell.tint} ${cell.iconClass}`}
                >
                  <Icon className="size-5" />
                </div>
                <h3 className="text-lg font-bold tracking-tight">{cell.title}</h3>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                  {cell.body}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
