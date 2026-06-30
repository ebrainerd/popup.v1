"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { SellerTermsAgreementDialog } from "@/components/legal/seller-terms-agreement-dialog";
import { Button } from "@/components/ui/button";

export function SellerTermsBanner() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-highlight/40 bg-highlight/10 px-4 py-3">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 size-5 shrink-0 text-highlight" />
          <div>
            <p className="font-medium">Seller terms not accepted yet</p>
            <p className="text-sm text-muted-foreground">
              Review and accept the Terms of Service before you publish a drop for buyers.
            </p>
          </div>
        </div>
        <Button size="sm" className="shrink-0" onClick={() => setOpen(true)}>
          Review terms
        </Button>
      </div>

      {open && (
        <SellerTermsAgreementDialog
          onAccepted={() => {
            setOpen(false);
            router.refresh();
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
