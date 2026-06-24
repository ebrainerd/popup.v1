import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { sendDropReminders } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * Sends due drop reminders (24h, 1h, opening). Protected by CRON_SECRET.
 * Not registered in vercel.json on Hobby — trigger manually or via external scheduler.
 */
export async function GET(request: NextRequest) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  const sent = await sendDropReminders();
  return NextResponse.json({ sent });
}
