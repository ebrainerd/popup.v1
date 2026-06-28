"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptSellerTerms } from "@/app/dashboard/actions";
import { TermsOfServiceContent } from "@/components/legal/terms-of-service-content";
import { Button } from "@/components/ui/button";
import { LEGAL_LAST_UPDATED } from "@/lib/legal-site";

/**
 * Full-screen terms gate for first-time sellers. The acknowledge button stays
 * disabled until the user scrolls to the end of the Terms of Service.
 */
export function SellerTermsAgreementDialog({
  onAccepted,
  onCancel,
}: {
  onAccepted: () => void;
  onCancel: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const checkScrollPosition = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 12;
    if (atBottom) setScrolledToEnd(true);
  }, []);

  useEffect(() => {
    checkScrollPosition();
  }, [checkScrollPosition]);

  function handleAcknowledge() {
    setError(null);
    startTransition(async () => {
      const res = await acceptSellerTerms();
      if (res.error) {
        setError(res.error);
        return;
      }
      onAccepted();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-terms-title"
        className="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col rounded-2xl border border-border bg-background shadow-xl"
      >
        <div className="border-b border-border px-6 py-4">
          <h2 id="seller-terms-title" className="text-lg font-semibold">
            Seller Terms of Service
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Read the full agreement below before opening a shop. Last updated: {LEGAL_LAST_UPDATED}
          </p>
        </div>

        <div
          ref={scrollRef}
          onScroll={checkScrollPosition}
          className="min-h-0 flex-1 overflow-y-auto px-6 py-4"
        >
          <TermsOfServiceContent />
        </div>

        <div className="space-y-3 border-t border-border px-6 py-4">
          {!scrolledToEnd && (
            <p className="text-center text-xs text-muted-foreground">
              Scroll to the bottom to enable Acknowledge.
            </p>
          )}
          {error && <p className="text-center text-sm text-live">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAcknowledge} disabled={!scrolledToEnd || pending}>
              {pending ? "Saving…" : "Acknowledge"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
