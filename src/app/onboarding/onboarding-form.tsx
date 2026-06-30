"use client";

import { useState } from "react";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USERNAME_PERMANENCE_NOTICE, validateUsername } from "@/lib/username";

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
      const res = await fetch("/api/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameResult.username,
          avatarUrl: avatarUrl || "",
          redirectTo,
        }),
      });

      const payload = (await res.json()) as { error?: string; redirectTo?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not save your profile.");
        return;
      }

      // Full navigation so middleware sees profile_setup_complete immediately.
      window.location.assign(payload.redirectTo ?? "/dashboard");
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
