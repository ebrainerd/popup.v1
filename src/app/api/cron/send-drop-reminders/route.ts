import { NextResponse, type NextRequest } from "next/server";
import { sendDropReminders } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * Sends due drop reminders (24h, 1h, opening). Protected by CRON_SECRET.
 * Schedule every 15 minutes on Vercel Pro for reliable opening-time delivery.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const fromQuery = request.nextUrl.searchParams.get("secret");
    const provided = auth?.replace(/^Bearer\s+/i, "") ?? fromQuery;
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const sent = await sendDropReminders();
  return NextResponse.json({ sent });
}
