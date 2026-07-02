import { NextResponse } from "next/server";
import { sendOpeningRemindersForShop } from "@/lib/notifications";
import { isSameOriginRequest } from "@/lib/same-origin";

export const dynamic = "force-dynamic";

/** Fire opening drop reminders when a shop's countdown hits zero (no cron wait). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  // sendOpeningRemindersForShop is internally guarded: published + currently
  // open shops only, and each delivery is claimed exactly once.
  const sent = await sendOpeningRemindersForShop(id);
  return NextResponse.json({ sent });
}
