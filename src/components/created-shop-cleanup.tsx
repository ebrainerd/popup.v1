"use client";

import { useEffect } from "react";

const NEW_SHOP_FORM_KEY = "popup-new-shop-form";

/** Clears create-form session storage after a shop is created. */
export function CreatedShopCleanup({ created }: { created: boolean }) {
  useEffect(() => {
    if (!created) return;
    sessionStorage.removeItem(NEW_SHOP_FORM_KEY);
  }, [created]);

  return null;
}
