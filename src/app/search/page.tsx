import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { isInviteOnlyMode } from "@/lib/discovery";
import { searchProfiles } from "@/lib/users";
import { searchShops } from "@/lib/shops";
import { UserCard } from "@/components/user-card";
import { ShopCard } from "@/components/shop-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Find creators" };
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (isInviteOnlyMode()) {
    redirect("/sell");
  }

  const { q } = await searchParams;
  const query = (q ?? "").toString();
  const trimmed = query.trim();
  const [creators, shops] = trimmed
    ? await Promise.all([searchProfiles(query), searchShops(query)])
    : [[], []];
  const hasResults = creators.length > 0 || shops.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Search</h1>
      <p className="mb-5 text-muted-foreground">
        Find creators by name/@username, or search open shops by name.
      </p>

      <form action="/search" method="get" className="flex gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search creators or shops…"
          aria-label="Search creators or shops"
          autoFocus
        />
        <Button type="submit">
          <SearchIcon className="size-4" /> Search
        </Button>
      </form>

      <div className="mt-8 space-y-8">
        {!trimmed ? (
          <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
            Start typing to find creators and shops.
          </p>
        ) : !hasResults ? (
          <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
            No results for “{query}”.
          </p>
        ) : (
          <>
            {creators.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Creators
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {creators.map((profile) => (
                    <UserCard key={profile.id} profile={profile} />
                  ))}
                </div>
              </section>
            )}
            {shops.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Shops
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {shops.map((shop) => (
                    <ShopCard key={shop.id} shop={shop} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
