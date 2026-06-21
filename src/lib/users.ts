import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

export type ProfileLite = Pick<
  Profile,
  "id" | "username" | "display_name" | "avatar_url" | "rating_avg" | "rating_count"
>;

const FIELDS = "id, username, display_name, avatar_url, rating_avg, rating_count";

/** Search users by username or display name. */
export async function searchProfiles(query: string): Promise<ProfileLite[]> {
  // Strip characters that would break a PostgREST `or` filter.
  const term = query.replace(/[%,()*\\]/g, "").trim();
  if (!term) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(FIELDS)
    .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    .order("rating_count", { ascending: false })
    .limit(24);

  if (error) {
    console.error("searchProfiles error", error.message);
    return [];
  }
  return (data ?? []) as ProfileLite[];
}

/** Sellers that the given user follows (most recently followed first). */
export async function getFollowedSellers(userId: string): Promise<ProfileLite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_follows")
    .select(`seller:profiles!shop_follows_seller_id_fkey(${FIELDS})`)
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getFollowedSellers error", error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => (row as unknown as { seller: ProfileLite | null }).seller)
    .filter((p): p is ProfileLite => Boolean(p));
}
