"use client";

import { useEffect } from "react";
import { clearWizardDraftStorage } from "@/lib/shop-wizard";

const NEW_SHOP_FORM_KEY = "popup-new-shop-form";

/** Clears wizard session storage after setup finishes. */
export function CreatedShopCleanup({
  created,
  shopId,
}: {
  created: boolean;
  shopId?: string;
}) {
  useEffect(() => {
    if (!created) return;
    sessionStorage.removeItem(NEW_SHOP_FORM_KEY);
    clearWizardDraftStorage();
    if (shopId) clearWizardDraftStorage(shopId);
  }, [created, shopId]);

  return null;
}
