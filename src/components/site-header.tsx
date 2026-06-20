import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">
            Explore
          </Link>
          <Link
            href="/?tab=live"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Live now
          </Link>
          <Link
            href="/?tab=soon"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Opening soon
          </Link>
        </nav>

        <div className="flex items-center gap-2">
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
              <Button asChild size="sm">
                <Link href="/signup">Start a shop</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
