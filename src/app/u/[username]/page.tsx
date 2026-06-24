import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { isInviteOnlyMode } from "@/lib/discovery";
import { ShopCard } from "@/components/shop-card";
import { FollowButton } from "@/components/follow-button";
import { NotifyButton } from "@/components/notify-button";
import { ProfileBioForm } from "@/components/profile-bio-form";
import { deriveShopStatus } from "@/lib/utils";
import type { ShopWithSeller } from "@/lib/shops";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const inviteOnly = isInviteOnlyMode();

  const { count: followerCount } = await supabase
    .from("shop_follows")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", profile.id);

  let shopsQuery = supabase
    .from("shops")
    .select(
      "*, seller:profiles!shops_seller_id_fkey(id, username, display_name, avatar_url, rating_avg, rating_count)",
    )
    .eq("seller_id", profile.id)
    .neq("status", "draft")
    .order("start_at", { ascending: false })
    .limit(24);

  // In marketplace mode only public shops appear on profiles; invite-only drops are
  // link-shared but followers should still see a creator's scheduled/live shops.
  if (!inviteOnly) {
    shopsQuery = shopsQuery.eq("visibility", "public");
  }

  const { data: shops } = await shopsQuery;

  const user = await getCurrentUser();
  const isOwner = user?.id === profile.id;
  let isFollowing = false;
  if (user && !isOwner) {
    const { data } = await supabase
      .from("shop_follows")
      .select("follower_id")
      .eq("seller_id", profile.id)
      .eq("follower_id", user.id)
      .maybeSingle();
    isFollowing = Boolean(data);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.username} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                {(profile.display_name || profile.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-muted-foreground">@{profile.username}</p>
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              {profile.rating_count > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="size-4 fill-current text-primary" />
                  {Number(profile.rating_avg ?? 0).toFixed(1)} ({profile.rating_count})
                </span>
              )}
              <span>{followerCount ?? 0} followers</span>
            </div>
          </div>
          {!isOwner && (
            <div className="flex items-center gap-2">
              <FollowButton sellerId={profile.id} initialFollowing={isFollowing} isAuthed={Boolean(user)} />
              {user && <NotifyButton />}
            </div>
          )}
        </div>

        {!isOwner && profile.bio && (
          <p className="mt-4 max-w-xl text-pretty text-foreground/90">{profile.bio}</p>
        )}

        {isOwner && <ProfileBioForm key={profile.bio ?? ""} bio={profile.bio} />}
      </div>

      <ShopSections shops={(shops ?? []) as unknown as ShopWithSeller[]} inviteOnly={inviteOnly} />
    </div>
  );
}

function ShopSections({
  shops,
  inviteOnly,
}: {
  shops: ShopWithSeller[];
  inviteOnly: boolean;
}) {
  if (shops.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
        {inviteOnly
          ? "No published drops yet. This creator shares link-only shops with their audience."
          : "No public shops yet."}
      </p>
    );
  }

  const live = shops.filter((s) => deriveShopStatus(s.start_at, s.end_at) === "open");
  const upcoming = shops
    .filter((s) => deriveShopStatus(s.start_at, s.end_at) === "scheduled")
    .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at));
  const past = shops.filter((s) => deriveShopStatus(s.start_at, s.end_at) === "ended");

  return (
    <div className="space-y-8">
      <ShopGroup title="Happening now" shops={live} />
      <ShopGroup title="Opening soon" shops={upcoming} />
      <ShopGroup title="Past drops" shops={past} />
    </div>
  );
}

function ShopGroup({ title, shops }: { title: string; shops: ShopWithSeller[] }) {
  if (shops.length === 0) return null;
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shops.map((shop) => (
          <ShopCard key={shop.id} shop={shop} />
        ))}
      </div>
    </section>
  );
}
