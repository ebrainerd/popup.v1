import { createClient } from "@/lib/supabase/server";

/** Returns true when the handle is not taken by another profile. */
export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase.from("profiles").select("id").eq("username", username);
  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) return false;
  return data == null;
}

export async function getProfileSetupComplete(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("profile_setup_complete")
    .eq("id", userId)
    .maybeSingle();
  return data?.profile_setup_complete ?? false;
}
