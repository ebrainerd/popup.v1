"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FollowResult = { following: boolean; error?: string };

/** Toggle following a seller. Requires an authenticated user. */
export async function toggleFollow(sellerId: string): Promise<FollowResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { following: false, error: "You must be logged in to follow sellers." };
  if (user.id === sellerId) return { following: false, error: "You can't follow yourself." };

  const { data: existing } = await supabase
    .from("shop_follows")
    .select("follower_id")
    .eq("seller_id", sellerId)
    .eq("follower_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("shop_follows")
      .delete()
      .eq("seller_id", sellerId)
      .eq("follower_id", user.id);
    if (error) return { following: true, error: error.message };
    revalidatePath("/", "layout");
    return { following: false };
  }

  const { error } = await supabase
    .from("shop_follows")
    .insert({ seller_id: sellerId, follower_id: user.id });
  if (error) return { following: false, error: error.message };

  revalidatePath("/", "layout");
  return { following: true };
}
