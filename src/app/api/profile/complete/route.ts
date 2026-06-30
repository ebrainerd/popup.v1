import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isUsernameAvailable } from "@/lib/profile";
import { validateUsername } from "@/lib/username";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  username: z.string(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  redirectTo: z.string().optional(),
});

function safeRedirectPath(path: string | undefined): string {
  if (path?.startsWith("/") && !path.startsWith("//")) return path;
  return "/dashboard";
}

/** Finish OAuth onboarding: username, optional avatar, profile_setup_complete. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session expired. Please log in again." },
      { status: 401 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { username: usernameInput, avatarUrl, redirectTo } = parsed.data;
  const usernameResult = validateUsername(usernameInput);
  if (!usernameResult.ok) {
    return NextResponse.json({ error: usernameResult.error }, { status: 400 });
  }

  const available = await isUsernameAvailable(usernameResult.username, user.id);
  if (!available) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 400 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      username: usernameResult.username,
      avatar_url: avatarUrl || null,
      profile_setup_complete: true,
    })
    .eq("id", user.id)
    .select("profile_setup_complete")
    .single();

  if (error || !profile?.profile_setup_complete) {
    return NextResponse.json(
      { error: error?.message ?? "Could not save your profile." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    redirectTo: safeRedirectPath(redirectTo),
  });
}
