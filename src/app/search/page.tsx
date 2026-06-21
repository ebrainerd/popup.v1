import type { Metadata } from "next";
import { Search as SearchIcon } from "lucide-react";
import { searchProfiles } from "@/lib/users";
import { UserCard } from "@/components/user-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Find creators" };
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").toString();
  const results = query.trim() ? await searchProfiles(query) : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Find creators</h1>
      <p className="mb-5 text-muted-foreground">
        Search by name or @username to see their drops and follow them.
      </p>

      <form action="/search" method="get" className="flex gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search creators…"
          aria-label="Search creators"
          autoFocus
        />
        <Button type="submit">
          <SearchIcon className="size-4" /> Search
        </Button>
      </form>

      <div className="mt-6">
        {!query.trim() ? (
          <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
            Start typing to find creators.
          </p>
        ) : results.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
            No creators found for “{query}”.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {results.map((profile) => (
              <UserCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
