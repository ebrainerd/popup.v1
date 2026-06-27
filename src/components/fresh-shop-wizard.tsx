"use client";

import { useEffect } from "react";
import { clearActiveDraftShop } from "@/components/continue-draft-shop";

/** Ensure Create Shop always opens a blank wizard. */
export function FreshShopWizard() {
  useEffect(() => {
    clearActiveDraftShop();
  }, []);

  return null;
}
