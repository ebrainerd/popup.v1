"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { completeProfileSetup } from "@/app/onboarding/actions";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USERNAME_PERMANENCE_NOTICE } from "@/lib/username";

const initialState = { error: null as string | null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? "Saving…" : "Continue"}
    </Button>
  );
}

export function OnboardingForm({
  redirectTo,
  initialUsername,
}: {
  redirectTo?: string;
  initialUsername?: string;
}) {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [state, formAction] = useActionState(completeProfileSetup, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo ?? "/dashboard"} />
      <input type="hidden" name="avatar_url" value={avatarUrl} />

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

      {state.error && (
        <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}
