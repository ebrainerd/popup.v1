import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} PopUp. Shops that open and close on the clock.</p>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/" className="hover:text-foreground">
            Explore
          </Link>
          <Link href="/dashboard" className="hover:text-foreground">
            Sell
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
