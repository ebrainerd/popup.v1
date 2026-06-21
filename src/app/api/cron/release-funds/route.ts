import { NextResponse, type NextRequest } from "next/server";
import { releaseEligibleOrders, releaseExpiredHolds } from "@/lib/payouts";

export const dynamic = "force-dynamic";

/**
 * Releases funds for orders whose hold window has elapsed.
 * Intended to be hit by a scheduler (Vercel Cron / Supabase scheduled function)
 * on an interval. Protected by CRON_SECRET via the `Authorization: Bearer` header
 * or a `?secret=` query param.
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

  const released = await releaseEligibleOrders();
  const holdsReleased = await releaseExpiredHolds();
  return NextResponse.json({ released, holdsReleased });
}
