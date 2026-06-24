import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isInviteOnlyMode } from "@/lib/discovery";
import { getFollowedSellers } from "@/lib/users";
import { UserCard } from "@/components/user-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Following" };
export const dynamic = "force-dynamic";

export default async function FollowingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/following");

  const sellers = await getFollowedSellers(user.id);
  const inviteOnly = isInviteOnlyMode();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Following</h1>
      <p className="mb-5 text-muted-foreground">
        Creators you follow — you&apos;ll be notified when they open a shop or go live.
      </p>

      {sellers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <Heart className="mx-auto mb-2 size-7 text-muted-foreground" />
          <p className="text-muted-foreground">You&apos;re not following anyone yet.</p>
          {inviteOnly ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Open a creator&apos;s PopUp shop link, then tap Follow on their drop page.
            </p>
          ) : (
            <Button asChild className="mt-4 rounded-full">
              <Link href="/search">Find creators</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sellers.map((profile) => (
            <UserCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
