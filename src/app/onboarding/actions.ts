"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isUsernameAvailable } from "@/lib/profile";
import { USERNAME_PERMANENCE_NOTICE, validateUsername } from "@/lib/username";

export type ProfileActionState = { error: string | null; success?: boolean };

const avatarUrlSchema = z.string().url().optional().or(z.literal(""));

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function completeProfileSetup(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const { supabase, user } = await requireUser();

  const usernameInput = String(formData.get("username") ?? "");
  const usernameResult = validateUsername(usernameInput);
  if (!usernameResult.ok) {
    return { error: usernameResult.error };
  }

  const available = await isUsernameAvailable(usernameResult.username, user.id);
  if (!available) {
    return { error: "That username is already taken." };
  }

  const avatarRaw = String(formData.get("avatar_url") ?? "").trim();
  const avatarParsed = avatarUrlSchema.safeParse(avatarRaw);
  if (!avatarParsed.success) {
    return { error: "Invalid avatar URL." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      username: usernameResult.username,
      avatar_url: avatarParsed.data || null,
      profile_setup_complete: true,
    })
    .eq("id", user.id)
    .select("username")
    .single();

  if (error || !profile) {
    return { error: error?.message ?? "Could not save your profile." };
  }

  const redirectTo = safeRedirectPath(formData.get("redirectTo"));
  revalidatePath("/", "layout");
  revalidatePath(`/u/${profile.username}`);
  redirect(redirectTo);
}

function safeRedirectPath(input: FormDataEntryValue | null): string {
  const value = typeof input === "string" ? input : "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/dashboard";
}

export { USERNAME_PERMANENCE_NOTICE };
