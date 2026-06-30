import Link from "next/link";
import { LEGAL_BUSINESS_NAME } from "@/lib/legal-site";
import { cn } from "@/lib/utils";

/**
 * Conspicuous "sign-in-wrap" / clickwrap assent notice placed next to an
 * account-creation, sign-in, or purchase action. Presenting the Terms and
 * Privacy links at the point of action — and making clear that proceeding is
 * agreement — is what makes those agreements (arbitration, class-action waiver,
 * liability limits, indemnity) enforceable. Keep it visible, not buried.
 */
export function LegalConsentNotice({
  action,
  confirmAge = false,
  className,
}: {
  /** Verb phrase describing the user action, e.g. "creating an account". */
  action: string;
  /** When true, the user also affirms they meet the 18+ eligibility requirement. */
  confirmAge?: boolean;
  className?: string;
}) {
  return (
    <p className={cn("text-center text-xs text-muted-foreground", className)}>
      By {action}, you{" "}
      {confirmAge ? "confirm you are at least 18 years old and " : ""}agree to {LEGAL_BUSINESS_NAME}
      &apos;s{" "}
      <Link
        href="/legal/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary hover:underline"
      >
        Terms of Service
      </Link>{" "}
      and{" "}
      <Link
        href="/legal/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary hover:underline"
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
}
