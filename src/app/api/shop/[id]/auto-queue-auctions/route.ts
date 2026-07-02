import { NextResponse } from "next/server";
import { autoQueueShopAuctions } from "@/lib/auctions";
import { isSameOriginRequest } from "@/lib/same-origin";

export const dynamic = "force-dynamic";

/** Queue pre-bid-eligible auction lots as soon as the shop opens (no seller action). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  // The underlying RPC is idempotent and only acts on published shops
  // inside their pre-open/open window.
  const queued = await autoQueueShopAuctions(id);
  return NextResponse.json({ queued });
}
