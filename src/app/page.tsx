import Link from "next/link";
import { Sparkles, Radio, Clock, Store, Bell, Zap } from "lucide-react";
import { getExploreShops, type ExploreTab } from "@/lib/shops";
import { ShopCard } from "@/components/shop-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TABS: { key: ExploreTab; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <Sparkles className="size-4" /> },
  { key: "live", label: "Dropping Live", icon: <Radio className="size-4" /> },
  { key: "soon", label: "Opening Soon", icon: <Clock className="size-4" /> },
];

const STEPS = [
  {
    icon: <Store className="size-5" />,
    title: "Creators open a timed shop",
    body: "Set a start and end — the shop opens and closes on the clock.",
  },
  {
    icon: <Bell className="size-5" />,
    title: "Buyers discover & follow",
    body: "Browse what's happening now and get notified when favorites go live.",
  },
  {
    icon: <Zap className="size-5" />,
    title: "Shop live & catch flash drops",
    body: "Join the room, chat, and grab flash drops before the countdown ends.",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: ExploreTab = rawTab === "live" || rawTab === "soon" ? rawTab : "all";
  const shops = await getExploreShops(tab);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero */}
      <section className="relative mb-12 overflow-hidden rounded-2xl px-6 py-16 text-center text-white sm:px-12 sm:py-20">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#ff3b8b] via-[#a21caf] to-[#4c1d95]" />
        <div
          aria-hidden
          className="animate-drift absolute -z-10 left-1/2 top-1/2 h-[120%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 blur-3xl"
        />
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
          Shops that open — and close — on the clock.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-white/90 sm:text-lg">
          Limited windows. Real moments. Follow creators and catch their drops before they vanish.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-full border-white/40 bg-white px-8 text-primary hover:bg-white/90"
          >
            <Link href="/signup">Start your drop</Link>
          </Button>
          <Link href="#explore" className="text-sm text-white/90 underline-offset-4 hover:underline">
            Browse what&apos;s happening now ↓
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="mb-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                {step.icon}
              </div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Happening Now */}
      <section id="explore" className="scroll-mt-20">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Happening Now</h2>
          <div className="flex gap-1 rounded-full border border-border bg-muted p-1">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === "all" ? "/" : `/?tab=${t.key}`}
                scroll={false}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === t.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {shops.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ tab }: { tab: ExploreTab }) {
  const copy =
    tab === "live"
      ? "Nothing dropping live right now. Check back soon!"
      : tab === "soon"
        ? "Nothing opening soon yet. Be the first to start a drop."
        : "No open shops yet. The next drop could be yours.";
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center">
      <p className="text-muted-foreground">{copy}</p>
      <Button asChild className="mt-4 rounded-full">
        <Link href="/signup">Start a drop</Link>
      </Button>
    </div>
  );
}
