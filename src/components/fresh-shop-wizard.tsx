"use client";

import { useEffect } from "react";
import { ACTIVE_DRAFT_KEY } from "@/components/continue-draft-shop";
import { clearWizardDraftStorage } from "@/lib/shop-wizard";

/** Start a blank wizard on /new — no stale banner or fields from past sessions. */
export function FreshShopWizard() {
  useEffect(() => {
    if (sessionStorage.getItem(ACTIVE_DRAFT_KEY)) return;
    clearWizardDraftStorage();
  }, []);

  return null;
}
