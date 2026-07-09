import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { createShopPath } from "@/lib/auth-routes";
import { isInviteOnlyMode } from "@/lib/discovery";

export const metadata: Metadata = {
  title: "About",
  description: "PopUp helps creators run timed online pop-up shops and share them in one link.",
};

export default async function AboutPage() {
  const inviteOnly = isInviteOnlyMode();
  const user = await getCurrentUser();
  const createShopHref = createShopPath(Boolean(user));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">About PopUp</h1>

      <div className="mt-6 space-y-5 text-pretty text-foreground/90">
        <p>
          PopUp is for creators who want to run a timed online pop-up shop, not a permanent
          storefront. You set a schedule, share one link, go live, and sell before the countdown
          runs out.
        </p>
        <p>
          Every drop is an event: a waiting room before open, flash surprises while you&apos;re
          live, and a clean close when time&apos;s up. Buyers join through your link, so there&apos;s
          no browsing a public catalog.
        </p>
        <p>
          Buyers pay through Stripe, track every order, and rate sellers after delivery — so you
          know who you&apos;re buying from before the drop opens.
        </p>

        <h2 className="pt-2 text-xl font-bold">How it works</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Create a timed shop and add products.</li>
          <li>Share your shop link with your audience.</li>
          <li>Open when the countdown hits zero: chat, flash drops, and checkout together.</li>
          <li>Stripe handles payments; shipping is included in the price you set.</li>
        </ol>

        <h2 className="pt-2 text-xl font-bold">Get in touch</h2>
        <p>
          Questions or feedback? Reach us at{" "}
          <a href="mailto:support@popupdrop.co" className="text-primary hover:underline">
            support@popupdrop.co
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
          <Link href={inviteOnly ? createShopHref : "/explore"}>
            {inviteOnly ? "Create a pop-up shop" : "Explore drops"}
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/sell">{inviteOnly ? "How it works" : "Start selling"}</Link>
        </Button>
      </div>
    </div>
  );
}
