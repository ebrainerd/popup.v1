import Link from "next/link";
import { Sparkles, Radio, Clock, Flame, CalendarClock, Heart } from "lucide-react";
import { getExploreShops, type ExploreTab, type ExploreSort } from "@/lib/shops";
import { getCurrentUser } from "@/lib/auth";
import { ShopCard } from "@/components/shop-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS: { key: ExploreTab; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <Sparkles className="size-4" /> },
  { key: "streaming", label: "Live stream", icon: <Radio className="size-4" /> },
  { key: "soon", label: "Opening Soon", icon: <Clock className="size-4" /> },
  { key: "following", label: "Following", icon: <Heart className="size-4" /> },
];

const SORTS: { key: ExploreSort; label: string; icon: React.ReactNode }[] = [
  { key: "soonest", label: "Soonest", icon: <CalendarClock className="size-4" /> },
  { key: "popular", label: "Popular", icon: <Flame className="size-4" /> },
];

function buildHref(tab: ExploreTab, sort: ExploreSort) {
  const params = new URLSearchParams();
  if (tab !== "all") params.set("tab", tab);
  if (sort !== "soonest") params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/explore?${qs}` : "/explore";
}

export default async function MarketplaceExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; sort?: string }>;
}) {
  const { tab: rawTab, sort: rawSort } = await searchParams;
  const tab: ExploreTab =
    rawTab === "streaming" || rawTab === "soon" || rawTab === "following" ? rawTab : "all";
  const sort: ExploreSort = rawSort === "popular" ? "popular" : "soonest";
  const user = tab === "following" ? await getCurrentUser() : null;
  const shops =
    tab === "following" && !user ? [] : await getExploreShops(tab, sort, user?.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight">Explore</h1>
      <p className="mb-6 text-muted-foreground">Upcoming drops, live shops, and creators you follow.</p>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex gap-1 rounded-full border border-border bg-muted p-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={buildHref(t.key, sort)}
              scroll={false}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.icon}
              <span>{t.label}</span>
            </Link>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort</span>
          <div className="flex gap-1 rounded-full border border-border bg-muted p-1">
            {SORTS.map((s) => (
              <Link
                key={s.key}
                href={buildHref(tab, s.key)}
                scroll={false}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  sort === s.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.icon}
                <span>{s.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {shops.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">
            {tab === "following"
              ? user
                ? "No upcoming or live drops from creators you follow."
                : "Log in to see drops from creators you follow."
              : tab === "streaming"
                ? "No one is streaming live right now. Check upcoming drops instead."
                : tab === "soon"
                  ? "Nothing opening soon yet. Follow creators or start your own drop."
                  : "No open or upcoming drops yet. The next one could be yours."}
          </p>
          <Button asChild className="mt-4 rounded-full">
            <Link
              href={
                tab === "following" && !user
                  ? "/login?redirectTo=/explore?tab=following"
                  : tab === "soon" || tab === "streaming"
                    ? "/explore?tab=soon"
                    : "/signup"
              }
            >
              {tab === "following" && !user
                ? "Log in"
                : tab === "soon" || tab === "streaming"
                  ? "Browse upcoming"
                  : "Start a drop"}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      )}
    </div>
  );
}
