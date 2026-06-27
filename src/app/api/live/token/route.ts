import { NextResponse } from "next/server";
import { z } from "zod";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  getLiveKitUrl,
  isNativeLiveEnabled,
  shopLiveKitRoomName,
  type LiveTokenRole,
} from "@/lib/live-stream";
import { deriveShopStatus } from "@/lib/utils";

const bodySchema = z.object({
  shopId: z.string().uuid(),
  role: z.enum(["publisher", "subscriber", "preview"]),
});

export async function POST(request: Request) {
  if (!isNativeLiveEnabled()) {
    return NextResponse.json({ error: "Native live streaming is not enabled." }, { status: 503 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit is not configured." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { shopId, role } = parsed.data;

  const supabase = createServiceRoleClient();
  const { data: shop, error: shopError } = await supabase
    .from("shops")
    .select(
      "id, seller_id, status, start_at, end_at, is_live, stream_provider, stream_room_id, live_url, twitch_url",
    )
    .eq("id", shopId)
    .maybeSingle();

  if (shopError || !shop) {
    return NextResponse.json({ error: "Shop not found." }, { status: 404 });
  }

  if (shop.status === "draft") {
    return NextResponse.json({ error: "Shop not available." }, { status: 403 });
  }

  const shopStatus = deriveShopStatus(shop.start_at, shop.end_at);
  if (shopStatus === "ended") {
    return NextResponse.json({ error: "Shop has ended." }, { status: 403 });
  }

  const authCheck = await authorizeTokenRole(role, shopId, shop.seller_id, shop.is_live, shopStatus);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const roomName = shop.stream_room_id ?? shopLiveKitRoomName(shopId);
  const identity =
    role === "subscriber"
      ? `viewer-${crypto.randomUUID()}`
      : `seller-${shop.seller_id}`;

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: role === "subscriber" ? "2h" : "1h",
  });

  const grant =
    role === "subscriber"
      ? { roomJoin: true, room: roomName, canPublish: false, canSubscribe: true }
      : { roomJoin: true, room: roomName, canPublish: true, canSubscribe: true };

  token.addGrant(grant);

  const jwt = await token.toJwt();

  return NextResponse.json({
    token: jwt,
    roomName,
    livekitUrl: getLiveKitUrl(),
  });
}

async function authorizeTokenRole(
  role: LiveTokenRole,
  shopId: string,
  sellerId: string,
  isLive: boolean,
  shopStatus: ReturnType<typeof deriveShopStatus>,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (role === "subscriber") {
    if (!isLive) {
      return { ok: false, error: "Stream is not live.", status: 403 };
    }
    if (shopStatus !== "open") {
      return { ok: false, error: "Shop is not open.", status: 403 };
    }
    return { ok: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== sellerId) {
    return { ok: false, error: "Unauthorized.", status: 401 };
  }

  if (role === "publisher") {
    if (shopStatus !== "open") {
      return { ok: false, error: "Shop must be open to go live.", status: 403 };
    }
    return { ok: true };
  }

  // preview — seller camera test (scheduled or open, not live to public)
  return { ok: true };
}
