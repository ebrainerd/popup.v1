"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

type Step = {
  title: string;
  body: string;
  image: string;
  alt: string;
  /** Numeral color, cycled through the three brand accents. */
  numberClass: string;
};

const STEPS: Step[] = [
  {
    title: "Add your products",
    body: "Snap a few photos, write a name, set a price. Choose Buy Now or live auction for each piece. That's the whole job.",
    image: "/landing/step_products.webp",
    alt: "An open shipping box full of claymation products with a tiny phone on a tripod photographing a sneaker",
    numberClass: "text-primary",
  },
  {
    title: "Make it yours",
    body: "Pick a layout, colors, and vibe so your shop feels like your brand. No design skills, no code, just taps.",
    image: "/landing/step_customize.webp",
    alt: "Tiny claymation characters painting and decorating a miniature storefront in pink and teal",
    numberClass: "text-accent",
  },
  {
    title: "Pick your moment",
    body: "Choose when your shop opens and closes. A big countdown builds the hype for you while you get ready.",
    image: "/landing/step_schedule.webp",
    alt: "A claymation flip clock, alarm clock, and calendar with a date circled in pink",
    numberClass: "text-highlight",
  },
  {
    title: "Go live with your people",
    body: "Stream right from the app, or plug in your Twitch or YouTube stream. Chat and selling happen in the same room.",
    image: "/landing/step_golive.webp",
    alt: "A cute claymation smartphone on a ring light surrounded by floating chat bubbles and hearts",
    numberClass: "text-primary",
  },
  {
    title: "Send your link",
    body: "Share one link anywhere your people already are. They join the waiting room and get reminded before you open.",
    image: "/landing/step_invite.webp",
    alt: "Colorful claymation paper airplanes flying out of an open teal envelope, one carrying a link charm",
    numberClass: "text-accent",
  },
  {
    title: "Open the doors",
    body: "When the clock hits zero, you're live. Flash sales, auctions, and checkout all run in one place while you host.",
    image: "/landing/step_open.webp",
    alt: "A claymation shop with doors wide open, a happy crowd of round characters, and confetti cannons firing",
    numberClass: "text-highlight",
  },
];

/**
 * Scroll experience: each step card sticks below the header and the next
 * card slides up over it, so the walkthrough reads like a deck of cards
 * being dealt. Pure CSS position:sticky drives the stacking; Motion only
 * handles the in-view reveals (and is disabled under reduced motion).
 */
export function LandingSteps() {
  const reduce = useReducedMotion();

  return (
    <section id="how-it-works" className="scroll-mt-24 px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-lg text-muted-foreground">
            Six steps from first product to sold out. Keep scrolling.
          </p>
        </div>

        <ol className="space-y-6">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="sticky"
              style={{ top: `calc(4.5rem + ${i * 16}px)` }}
            >
              <article className="relative grid min-h-[70vh] overflow-hidden rounded-3xl bg-[#14070d] text-white ring-1 ring-white/10 shadow-2xl shadow-black/40 lg:min-h-[72vh] lg:grid-cols-2">
                <div className="relative flex flex-col justify-center p-8 sm:p-12 lg:p-16">
                  <motion.p
                    aria-hidden
                    initial={reduce ? false : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className={`text-7xl font-extrabold leading-none sm:text-8xl ${step.numberClass}`}
                  >
                    {i + 1}
                  </motion.p>
                  <motion.h3
                    initial={reduce ? false : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
                    className="mt-5 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl"
                  >
                    {step.title}
                  </motion.h3>
                  <motion.p
                    initial={reduce ? false : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.6, delay: 0.16, ease: EASE }}
                    className="mt-4 max-w-md text-pretty text-base leading-relaxed text-white/70 sm:text-lg"
                  >
                    {step.body}
                  </motion.p>
                </div>

                <div className="relative min-h-64 lg:min-h-0">
                  <Image
                    src={step.image}
                    alt={step.alt}
                    fill
                    sizes="(min-width: 1024px) 46vw, 92vw"
                    className="object-cover"
                  />
                  {/* Blend the render into the card surface */}
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-[#14070d] via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#14070d] lg:via-transparent lg:to-transparent"
                  />
                </div>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
