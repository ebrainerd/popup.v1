"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { ProfileAvatarForm } from "@/components/profile-avatar-form";
import { ProfileBioForm } from "@/components/profile-bio-form";
import { Button } from "@/components/ui/button";

/**
 * Owner-only profile editing, tucked behind an "Edit profile" toggle so the
 * owner sees their profile the way visitors do, and saved changes are
 * immediately visible on the page itself.
 */
export function ProfileEditPanel({
  avatarUrl,
  bio,
}: {
  avatarUrl: string | null;
  bio: string | null;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
        <Pencil className="size-4" /> Edit profile
      </Button>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Edit profile</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
          <X className="size-4" /> Done
        </Button>
      </div>
      {/* Keys resync the forms with saved server data after router.refresh(). */}
      <ProfileAvatarForm key={avatarUrl ?? "no-avatar"} avatarUrl={avatarUrl} />
      <ProfileBioForm key={bio ?? "no-bio"} bio={bio} />
    </div>
  );
}
