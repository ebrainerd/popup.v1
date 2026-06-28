import type { Metadata } from "next";
import { LegalTemplateNotice } from "@/components/legal-template-notice";
import { TermsOfServiceContent } from "@/components/legal/terms-of-service-content";
import { LEGAL_BUSINESS_NAME, LEGAL_LAST_UPDATED } from "@/lib/legal-site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `${LEGAL_BUSINESS_NAME} Terms of Service`,
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <LegalTemplateNotice />

      <h1 className="text-3xl font-extrabold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {LEGAL_LAST_UPDATED}</p>

      <TermsOfServiceContent className="mt-6" />
    </div>
  );
}
