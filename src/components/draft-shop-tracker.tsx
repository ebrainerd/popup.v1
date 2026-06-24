"use client";

import { useEffect } from "react";
import { trackActiveDraftShop } from "@/components/continue-draft-shop";

/** Remember draft shop id so /new resumes setup instead of restarting. */
export function DraftShopTracker({ shopId, isDraft }: { shopId: string; isDraft: boolean }) {
  useEffect(() => {
    trackActiveDraftShop(shopId, isDraft);
  }, [shopId, isDraft]);

  return null;
}
