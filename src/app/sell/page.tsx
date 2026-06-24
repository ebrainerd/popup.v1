import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Radio, Zap, CreditCard, Bell, BarChart3, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sell on PopUp",
  description: "Open a timed pop-up shop, run live auctions, go live, and get paid.",
};

const FEATURES = [
  { icon: <Clock className="size-5" />, title: "Time-boxed drops", body: "Schedule a start and end — your shop opens and closes automatically." },
  { icon: <Gavel className="size-5" />, title: "Live auctions", body: "Run countdown auctions with max bids, soft-close extensions, and winner checkout." },
  { icon: <Radio className="size-5" />, title: "Go live", body: "Stream and chat with buyers in real time while your shop is open." },
  { icon: <Zap className="size-5" />, title: "Flash drops", body: "Surprise discounts and flash-only items that broadcast instantly to the room." },
  { icon: <CreditCard className="size-5" />, title: "Get paid", body: "Stripe-powered checkout and payouts. A simple 9% platform fee per sale." },
  { icon: <Bell className="size-5" />, title: "Build a following", body: "Followers get notified when you go live so they never miss a drop." },
  { icon: <BarChart3 className="size-5" />, title: "Know your numbers", body: "Track sales, peak viewers, and ratings from your dashboard." },
];

export default function SellPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          Run live auctions from your own shop link.
        </h1>
        <p className="mt-4 text-pretty text-muted-foreground sm:text-lg">
          Schedule your drop, add auction lots or Buy Now items, share the link with your audience,
          and open when the countdown hits zero.
        </p>
        <div className="mt-7 flex justify-center">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href="/signup">Create shop</Link>
          </Button>
        </div>
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              {f.icon}
            </div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-14 rounded-2xl border border-border bg-card p-8 text-center">
        <h2 className="text-2xl font-bold">Ready to create your first shop?</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Create an account, add your products, and share your shop link when you&apos;re ready.
        </p>
        <Button asChild size="lg" className="mt-6 rounded-full px-8">
          <Link href="/signup">Create shop</Link>
        </Button>
      </section>
    </div>
  );
}
