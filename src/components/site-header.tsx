import Link from "next/link";
import { Search } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { isInviteOnlyMode } from "@/lib/discovery";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav, type MobileNavLink } from "@/components/mobile-nav";

export async function SiteHeader() {
  const profile = await getCurrentProfile();
  const inviteOnly = isInviteOnlyMode();

  const mobileLinks: MobileNavLink[] = [
    { href: "/", label: "Home" },
    ...(inviteOnly
      ? [{ href: "/sell", label: "How it works" }]
      : [
          { href: "/explore", label: "Explore" },
          { href: "/sell", label: "Sell" },
        ]),
    { href: "/about", label: "About" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-1">
          <MobileNav links={mobileLinks} />
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">
            Home
          </Link>
          {!inviteOnly && (
            <Link href="/explore" className="text-muted-foreground transition-colors hover:text-foreground">
              Explore
            </Link>
          )}
          <Link href="/sell" className="text-muted-foreground transition-colors hover:text-foreground">
            {inviteOnly ? "How it works" : "Sell"}
          </Link>
          <Link href="/about" className="text-muted-foreground transition-colors hover:text-foreground">
            About
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {!inviteOnly && (
            <Link
              href="/search"
              aria-label="Find creators"
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Search className="size-4" />
            </Link>
          )}
          <ThemeToggle />
          {profile ? (
            <>
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <UserMenu profile={profile} />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full">
                <Link href="/signup">{inviteOnly ? "Create shop" : "Start a Drop"}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
