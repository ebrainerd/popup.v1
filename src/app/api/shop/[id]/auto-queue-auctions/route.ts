import { NextResponse } from "next/server";
import { autoQueueShopAuctions } from "@/lib/auctions";

export const dynamic = "force-dynamic";

/** Queue pre-bid-eligible auction lots as soon as the shop opens (no seller action). */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const queued = await autoQueueShopAuctions(id);
  return NextResponse.json({ queued });
}
