"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { containsProfanity } from "@/lib/profanity";

export type ProfileActionState = { error: string | null; success?: boolean };

const bioSchema = z.object({
  bio: z
    .string()
    .trim()
    .max(280, "Bio must be 280 characters or fewer.")
    .optional()
    .or(z.literal("")),
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function updateProfileBio(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const { supabase, user } = await requireUser();

  const parsed = bioSchema.safeParse({ bio: formData.get("bio") ?? "" });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid bio." };
  }

  const bio = parsed.data.bio?.trim() ?? "";
  if (bio && containsProfanity(bio)) {
    return { error: "Please remove inappropriate language from your bio." };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ bio: bio || null })
    .eq("id", user.id)
    .select("username")
    .single();

  if (error || !profile) {
    return { error: error?.message ?? "Could not update profile." };
  }

  revalidatePath(`/u/${profile.username}`);
  revalidatePath("/dashboard");
  return { error: null, success: true };
}
