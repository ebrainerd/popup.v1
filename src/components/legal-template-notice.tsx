/** Shown on legal pages in non-production until counsel signs off. */
export function LegalTemplateNotice() {
  if (process.env.NEXT_PUBLIC_APP_ENV === "production") return null;

  return (
    <div className="mb-6 rounded-md border border-accent/40 bg-accent/5 p-3 text-sm text-muted-foreground">
      <strong>Template — review before launch.</strong> This is a starting point, not legal
      advice. Have it reviewed by qualified counsel and tailored to your business before relying
      on it.
    </div>
  );
}
