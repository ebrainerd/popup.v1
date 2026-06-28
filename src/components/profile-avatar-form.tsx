"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { updateProfileAvatar, type ProfileActionState } from "@/app/u/actions";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const initialState: ProfileActionState = { error: null };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save photo"}
    </Button>
  );
}

export function ProfileAvatarForm({
  avatarUrl,
}: {
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(updateProfileAvatar, initialState);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <form action={formAction} className="max-w-xs space-y-2">
      <div className="space-y-1.5">
        <Label>Profile photo</Label>
        <p className="text-xs text-muted-foreground">
          Shown on your profile, in chat, and in the nav menu. Square images work best.
        </p>
        <ImageUpload
          name="avatar_url"
          bucket="avatars"
          aspect="square"
          defaultValue={avatarUrl}
          label="Upload photo"
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">Photo saved.</p>
      )}

      <SaveButton />
    </form>
  );
}
