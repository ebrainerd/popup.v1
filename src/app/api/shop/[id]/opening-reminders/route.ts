import { NextResponse } from "next/server";
import { sendOpeningRemindersForShop } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/** Fire opening drop reminders when a shop's countdown hits zero (no cron wait). */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sent = await sendOpeningRemindersForShop(id);
  return NextResponse.json({ sent });
}
