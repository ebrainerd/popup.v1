import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { releaseEligibleOrders, releaseExpiredHolds } from "@/lib/payouts";
import { remindUnshippedOrders, nudgeAwaitingReceipt } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * Releases funds for orders whose hold window has elapsed.
 * Intended to be hit by a scheduler (Vercel Cron / Supabase scheduled function)
 * on an interval. Protected by CRON_SECRET via the `Authorization: Bearer` header
 * or a `?secret=` query param.
 */
export async function GET(request: NextRequest) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  const released = await releaseEligibleOrders();
  const holdsReleased = await releaseExpiredHolds();
  const shipReminders = await remindUnshippedOrders();
  const receiptNudges = await nudgeAwaitingReceipt();
  return NextResponse.json({ released, holdsReleased, shipReminders, receiptNudges });
}
