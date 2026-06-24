import Link from "next/link";
import { Link2, Store, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExploreHoldingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Store className="size-7" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">Invite-link drops only</h1>
      <p className="mt-3 text-pretty text-muted-foreground">
        PopUp is onboarding selected creators. There&apos;s no public marketplace to browse yet —
        every drop starts from a creator&apos;s shared shop link.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild className="rounded-full">
          <Link href="/signup">
            Create a pop-up shop
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/sell">How it works</Link>
        </Button>
      </div>
      <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Link2 className="size-4 shrink-0" />
        Got a creator&apos;s PopUp link? Open it directly to join their drop.
      </p>
    </div>
  );
}
