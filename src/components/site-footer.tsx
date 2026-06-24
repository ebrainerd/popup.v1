import Link from "next/link";
import { isInviteOnlyMode } from "@/lib/discovery";

export function SiteFooter() {
  const inviteOnly = isInviteOnlyMode();

  return (
    <footer className="relative border-t border-border/60 bg-background/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} PopUp.{" "}
          {inviteOnly
            ? "Online pop-up shops in one link."
            : "Shops that open and close on the clock."}
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          {!inviteOnly && (
            <Link href="/explore" className="hover:text-foreground">
              Explore
            </Link>
          )}
          <Link href={inviteOnly ? "/sell" : "/dashboard"} className="hover:text-foreground">
            {inviteOnly ? "Create shop" : "Sell"}
          </Link>
          <Link href="/legal/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/legal/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
