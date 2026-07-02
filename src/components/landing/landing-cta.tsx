"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";

const EASE = [0.16, 1, 0.3, 1] as const;

export function LandingCta({ createShopHref }: { createShopHref: string }) {
  const reduce = useReducedMotion();

  return (
    <section className="px-4 pb-20 pt-4 sm:pb-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="bg-brand-gradient relative overflow-hidden rounded-3xl text-white"
        >
          <div className="relative z-10 grid items-center gap-6 px-8 py-14 sm:px-12 sm:py-20 lg:grid-cols-[1.2fr_1fr]">
            <div className="text-center lg:text-left">
              <h2 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
                Your first drop could be this weekend.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-pretty text-lg text-white/85 lg:mx-0">
                Set it up tonight, invite your people, and open the doors.
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
            <div className="relative mx-auto hidden w-full max-w-xs lg:block">
              <Image
                src="/landing/cta_bag.webp"
                alt="A glossy pink claymation shopping bag with confetti bursting out of the top"
                width={1536}
                height={1024}
                sizes="20rem"
                className="animate-float h-auto w-full drop-shadow-2xl"
              />
            </div>
          </div>
        </motion.div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Just here to shop? Got a creator&apos;s PopUp link? Open it directly
          to join their drop.
        </p>
      </div>
    </section>
  );
}
