"use client";

import { useEffect } from "react";
import { bigCelebrate } from "@/lib/confetti";

/** Fires a one-time confetti burst when a purchase completes. */
export function CheckoutCelebration() {
  useEffect(() => {
    bigCelebrate();
  }, []);
  return null;
}
