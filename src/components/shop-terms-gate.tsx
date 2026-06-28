"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SellerTermsAgreementDialog } from "@/components/legal/seller-terms-agreement-dialog";

/** Blocks shop creation until the seller has scrolled through and accepted the Terms. */
export function ShopTermsGate({
  termsAccepted,
  children,
}: {
  termsAccepted: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(termsAccepted);

  if (accepted) return <>{children}</>;

  return (
    <SellerTermsAgreementDialog
      onAccepted={() => {
        setAccepted(true);
        router.refresh();
      }}
      onCancel={() => router.push("/dashboard")}
    />
  );
}
