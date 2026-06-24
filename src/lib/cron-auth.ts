import { NextResponse, type NextRequest } from "next/server";

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_APP_ENV === "production"
  );
}

/**
 * Verify cron route authorization. Fails closed in production when CRON_SECRET
 * is missing. Returns a response to send on failure, or null when authorized.
 */
export function verifyCronRequest(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (isProductionRuntime() && !secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (secret) {
    const auth = request.headers.get("authorization");
    const fromQuery = request.nextUrl.searchParams.get("secret");
    const provided = auth?.replace(/^Bearer\s+/i, "") ?? fromQuery;
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return null;
}
