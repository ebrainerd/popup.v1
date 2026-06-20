"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { LayoutDashboard, LogOut, Store, User as UserIcon, ShoppingBag } from "lucide-react";
import type { Profile } from "@/lib/database.types";
import { signOut } from "@/app/(auth)/actions";

export function UserMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initial = (profile.display_name || profile.username || "?").charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.username}
            width={36}
            height={36}
            className="h-full w-full object-cover"
          />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-semibold">
              {profile.display_name || profile.username}
            </p>
            <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
          </div>
          <MenuLink href="/dashboard" icon={<LayoutDashboard />} label="Dashboard" />
          <MenuLink href="/orders" icon={<ShoppingBag />} label="My orders" />
          <MenuLink href="/dashboard/shops/new" icon={<Store />} label="Create a shop" />
          <MenuLink href={`/u/${profile.username}`} icon={<UserIcon />} label="My profile" />
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-live hover:bg-muted [&_svg]:size-4"
            >
              <LogOut />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted [&_svg]:size-4"
      role="menuitem"
    >
      {icon}
      {label}
    </Link>
  );
}
