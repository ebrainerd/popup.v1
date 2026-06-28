import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import type { ProfileLite } from "@/lib/users";

export function UserCard({ profile }: { profile: ProfileLite }) {
  const name = profile.username;
  return (
    <Link
      href={`/u/${profile.username}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt={profile.username} fill className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-base font-bold text-muted-foreground">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{name}</p>
        <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
      </div>
      {profile.rating_count > 0 && (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Star className="size-3.5 fill-current text-primary" />
          {Number(profile.rating_avg ?? 0).toFixed(1)}
        </span>
      )}
    </Link>
  );
}
