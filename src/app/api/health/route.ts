import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lightweight liveness probe for uptime monitors. Intentionally has no
 * dependencies (no DB/Stripe calls) so it reflects app availability without
 * false negatives from a slow downstream service.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "popup",
    time: new Date().toISOString(),
  });
}
