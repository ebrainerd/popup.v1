"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { updateProfileBio, type ProfileActionState } from "@/app/u/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ProfileActionState = { error: null };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save bio"}
    </Button>
  );
}

export function ProfileBioForm({ bio }: { bio: string | null }) {
  const router = useRouter();
  const [state, formAction] = useActionState(updateProfileBio, initialState);
  const [value, setValue] = useState(bio ?? "");
  const remaining = 280 - value.length;

  // Pull the saved bio back into the page so the profile display updates.
  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <form action={formAction} className="mt-4 max-w-xl space-y-2">
      <div className="space-y-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="Tell buyers what you sell, your vibe, or when you drop next…"
        />
        <p className="text-xs text-muted-foreground">
          {remaining} character{remaining === 1 ? "" : "s"} left
        </p>
      </div>

      {state.error && (
        <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">Bio saved.</p>
      )}

      <SaveButton />
    </form>
  );
}
