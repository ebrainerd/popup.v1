"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";

const EASE = [0.16, 1, 0.3, 1] as const;

export function LandingHero({ createShopHref }: { createShopHref: string }) {
  const reduce = useReducedMotion();

  const fadeUp = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 28 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay, ease: EASE },
        };

  return (
    <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:pt-14 lg:min-h-[calc(100dvh-8rem)] lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pb-20">
      <div className="relative z-10 text-center lg:text-left">
        <motion.h1
          {...fadeUp(0)}
          className="text-balance text-6xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl"
        >
          Pop up.{" "}
          <span className="text-gradient-brand inline-block pb-2">Sell out.</span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.12)}
          className="mx-auto mt-6 max-w-md text-pretty text-lg text-muted-foreground sm:text-xl lg:mx-0"
        >
          Your own timed pop-up shop: products, countdown, live stream, and
          checkout. All in one link.
        </motion.p>

        <motion.div
          {...fadeUp(0.24)}
          className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start"
        >
          <Button
            asChild
            size="lg"
            className="group rounded-full px-8 text-base shadow-lg shadow-primary/30"
          >
            <Link href={createShopHref}>
              Create shop
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="rounded-full px-6 text-base">
            <Link href="#how-it-works">See how it works</Link>
          </Button>
        </motion.div>
      </div>

      <motion.div
        {...(reduce
          ? {}
          : {
              initial: { opacity: 0, scale: 0.92, rotate: 2 },
              animate: { opacity: 1, scale: 1, rotate: 0 },
              transition: { duration: 1, delay: 0.15, ease: EASE },
            })}
        className="relative"
      >
        {/* Ambient glow behind the render */}
        <div
          aria-hidden
          className="absolute -inset-8 -z-10 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--primary)_28%,transparent),transparent_70%)] blur-2xl"
        />
        <div className="animate-float overflow-hidden rounded-3xl ring-1 ring-border/70 shadow-2xl shadow-primary/10">
          <Image
            src="/landing/hero_stall.webp"
            alt="A tiny claymation pop-up market stall with a neon lightning bolt, shelves of colorful products, and confetti bursting around it"
            width={1536}
            height={1024}
            priority
            sizes="(min-width: 1024px) 44vw, 92vw"
            className="h-auto w-full"
          />
        </div>
      </motion.div>
    </section>
  );
}
