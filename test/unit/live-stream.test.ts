import { describe, expect, it } from "vitest";
import {
  canSellerGoLive,
  effectiveStreamProvider,
  parseStreamProviderFromUrls,
  providerToStreamChoice,
  shopLiveKitRoomName,
  getStreamSourceLabel,
} from "@/lib/live-stream";

describe("live-stream", () => {
  it("builds stable LiveKit room names", () => {
    expect(shopLiveKitRoomName("abc-123")).toBe("shop-abc-123");
  });

  it("parses stream provider from URLs", () => {
    expect(parseStreamProviderFromUrls(null, "https://twitch.tv/foo")).toBe("twitch");
    expect(parseStreamProviderFromUrls("https://youtube.com/watch?v=x", null)).toBe("youtube");
    expect(parseStreamProviderFromUrls(null, null)).toBe("native");
  });

  it("prefers stored stream_provider when set", () => {
    expect(
      effectiveStreamProvider({
        stream_provider: "native",
        live_url: "https://youtube.com/watch?v=x",
        twitch_url: null,
      }),
    ).toBe("native");
  });

  it("maps provider to stream source choice", () => {
    expect(providerToStreamChoice("native", false)).toBe("native");
    expect(providerToStreamChoice("youtube", false)).toBe("external");
    expect(providerToStreamChoice("none", true)).toBe("external");
  });

  it("labels stream sources for display", () => {
    expect(getStreamSourceLabel("native")).toBe("PopUp Live (in-app)");
    expect(getStreamSourceLabel("youtube")).toBe("YouTube");
  });

  it("allows go-live for native when LiveKit env is configured", () => {
    const prev = {
      key: process.env.LIVEKIT_API_KEY,
      secret: process.env.LIVEKIT_API_SECRET,
      url: process.env.LIVEKIT_URL,
    };
    process.env.LIVEKIT_API_KEY = "key";
    process.env.LIVEKIT_API_SECRET = "secret";
    process.env.LIVEKIT_URL = "wss://example.livekit.cloud";

    expect(canSellerGoLive({ stream_provider: "native" })).toBe(true);
    expect(
      canSellerGoLive({ stream_provider: "youtube", live_url: "https://youtube.com/watch?v=x" }),
    ).toBe(true);
    expect(canSellerGoLive({ stream_provider: "youtube" })).toBe(false);

    process.env.LIVEKIT_API_KEY = prev.key;
    process.env.LIVEKIT_API_SECRET = prev.secret;
    process.env.LIVEKIT_URL = prev.url;
  });
});
