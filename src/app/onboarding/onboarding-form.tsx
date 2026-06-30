"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { USERNAME_PERMANENCE_NOTICE, validateUsername } from "@/lib/username";

function safeRedirectPath(path: string | undefined): string {
  if (path?.startsWith("/") && !path.startsWith("//")) return path;
  return "/dashboard";
}

function isValidAvatarUrl(url: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function OnboardingForm({
  redirectTo,
  initialUsername,
}: {
  redirectTo?: string;
  initialUsername?: string;
}) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const usernameInput = String(new FormData(form).get("username") ?? "");
    const usernameResult = validateUsername(usernameInput);
    if (!usernameResult.ok) {
      setError(usernameResult.error);
      return;
    }

    if (!isValidAvatarUrl(avatarUrl)) {
      setError("Invalid avatar URL.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Your session expired. Please log in again.");
        return;
      }

      const { data: taken } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", usernameResult.username)
        .neq("id", user.id)
        .maybeSingle();
      if (taken) {
        setError("That username is already taken.");
        return;
      }

      const { data: profile, error: updateError } = await supabase
        .from("profiles")
        .update({
          username: usernameResult.username,
          avatar_url: avatarUrl || null,
          profile_setup_complete: true,
        })
        .eq("id", user.id)
        .select("id")
        .single();

      if (updateError || !profile) {
        const message = updateError?.message.toLowerCase() ?? "";
        if (message.includes("duplicate") || message.includes("username")) {
          setError("That username is already taken.");
        } else {
          setError(updateError?.message ?? "Could not save your profile.");
        }
        return;
      }

      router.push(safeRedirectPath(redirectTo));
    } catch {
      setError("Something went wrong saving your profile. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username">Choose your username</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            @
          </span>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            required
            defaultValue={initialUsername ?? ""}
            placeholder="yourname"
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z][a-zA-Z0-9_]*"
            className="pl-7"
          />
        </div>
        <p className="text-xs text-muted-foreground">{USERNAME_PERMANENCE_NOTICE}</p>
      </div>

      <div className="space-y-2">
        <Label>Profile photo (optional)</Label>
        <ImageUpload
          name="avatar_preview"
          bucket="avatars"
          aspect="square"
          label="Upload avatar"
          onChange={setAvatarUrl}
        />
      </div>

      {error && (
        <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">{error}</p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
