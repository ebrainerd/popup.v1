"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ACTIVE_DRAFT_KEY = "popup-active-draft-shop-id";

/** Resume an in-progress draft instead of starting over on /new. */
export function ContinueDraftShop() {
  const router = useRouter();

  useEffect(() => {
    const id = sessionStorage.getItem(ACTIVE_DRAFT_KEY);
    if (id) router.replace(`/dashboard/shops/${id}/setup`);
  }, [router]);

  return null;
}

export function trackActiveDraftShop(shopId: string, isDraft: boolean) {
  if (typeof window === "undefined") return;
  if (isDraft) {
    sessionStorage.setItem(ACTIVE_DRAFT_KEY, shopId);
  } else {
    sessionStorage.removeItem(ACTIVE_DRAFT_KEY);
  }
}

export function clearActiveDraftShop() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACTIVE_DRAFT_KEY);
}
