import Link from "next/link";
import { Sparkles, Radio, Clock } from "lucide-react";
import { getExploreShops, type ExploreTab } from "@/lib/shops";
import { ShopCard } from "@/components/shop-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TABS: { key: ExploreTab; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All public", icon: <Sparkles className="size-4" /> },
  { key: "live", label: "Live now", icon: <Radio className="size-4" /> },
  { key: "soon", label: "Opening soon", icon: <Clock className="size-4" /> },
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
      <section className="mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent px-6 py-12 text-center text-white sm:px-12">
        <h1 className="mx-auto max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
          Shops that open and close on the clock.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-white/90 sm:text-lg">
          Discover live drops, follow your favorite sellers, and buy before the countdown
          hits zero.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/40 bg-white text-primary hover:bg-white/90"
          >
            <Link href="/signup">Start your shop</Link>
          </Button>
          <Link href="#explore" className="text-sm text-white/90 underline-offset-4 hover:underline">
            or browse open shops ↓
          </Link>
        </div>
      </section>

      <section id="explore" className="scroll-mt-20">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Explore</h2>
          <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === "all" ? "/" : `/?tab=${t.key}`}
                scroll={false}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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
      ? "No shops are live right now. Check back soon!"
      : tab === "soon"
        ? "Nothing scheduled yet. Be the first to open one."
        : "No open shops yet. The next drop could be yours.";
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center">
      <p className="text-muted-foreground">{copy}</p>
      <Button asChild className="mt-4">
        <Link href="/signup">Create a shop</Link>
      </Button>
    </div>
  );
}
