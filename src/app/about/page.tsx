import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description: "PopUp is a platform for time-boxed virtual pop-up shops.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">About PopUp</h1>

      <div className="mt-6 space-y-5 text-pretty text-foreground/90">
        <p>
          PopUp is a vibrant, temporary night market that magically appears for a limited time.
          Creators open shops that run on a schedule — they open, they close, and the best moments
          happen in between.
        </p>
        <p>
          Instead of endless listings, PopUp is about being there: catch a creator going live,
          chat in the room, and grab flash drops before the countdown hits zero. When the clock
          runs out, the shop closes — so every drop feels like an event.
        </p>

        <h2 className="pt-2 text-xl font-bold">How it works</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Creators open a timed shop and add products.</li>
          <li>Buyers discover public shops and follow creators for notifications.</li>
          <li>When a shop is live, everyone shops, chats, and catches flash drops together.</li>
          <li>Checkout is instant via Stripe, with shipping included in the price.</li>
        </ol>

        <h2 className="pt-2 text-xl font-bold">Get in touch</h2>
        <p>
          Questions or feedback? Reach us at{" "}
          <a href="mailto:popup.shop.live@gmail.com" className="text-primary hover:underline">
            popup.shop.live@gmail.com
          </a>
          . See our{" "}
          <Link href="/legal/terms" className="text-primary hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      <div className="mt-10 flex gap-3">
        <Button asChild className="rounded-full">
          <Link href="/explore">Explore drops</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/sell">Start selling</Link>
        </Button>
      </div>
    </div>
  );
}
