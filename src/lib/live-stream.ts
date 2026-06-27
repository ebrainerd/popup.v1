import { parseLiveEmbed } from "@/lib/embeds";
import type { StreamProvider } from "@/lib/database.types";

export type StreamSourceChoice = "native" | "external";
export type LiveTokenRole = "publisher" | "subscriber" | "preview";

export function streamChoiceToProvider(choice: StreamSourceChoice): StreamProvider {
  return choice === "native" ? "native" : "youtube";
}

export function providerToStreamChoice(
  provider: StreamProvider,
  hasExternalUrl: boolean,
): StreamSourceChoice {
  if (provider === "youtube" || provider === "twitch" || hasExternalUrl) return "external";
  return "native";
}

/** Whether native PopUp Live is enabled (env + feature flag). */
export function isNativeLiveEnabled(): boolean {
  if (process.env.NATIVE_LIVE_ENABLED === "false") return false;
  return Boolean(
    process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET &&
      (process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL),
  );
}

export function shopLiveKitRoomName(shopId: string): string {
  return `shop-${shopId}`;
}

export function parseStreamProviderFromUrls(
  liveUrl: string | null | undefined,
  twitchUrl: string | null | undefined,
): StreamProvider {
  if (twitchUrl?.trim()) return "twitch";
  if (liveUrl?.trim()) {
    const embed = parseLiveEmbed(liveUrl);
    if (embed?.kind === "twitch") return "twitch";
    return "youtube";
  }
  return "native";
}

export function effectiveStreamProvider(shop: {
  stream_provider?: StreamProvider | null;
  live_url?: string | null;
  twitch_url?: string | null;
}): StreamProvider {
  const stored = shop.stream_provider;
  if (stored && stored !== "none") return stored;
  return parseStreamProviderFromUrls(shop.live_url, shop.twitch_url);
}

export function usesNativeStream(provider: StreamProvider): boolean {
  return provider === "native" && isNativeLiveEnabled();
}

export function canSellerGoLive(shop: {
  stream_provider?: StreamProvider | null;
  live_url?: string | null;
  twitch_url?: string | null;
}): boolean {
  const provider = effectiveStreamProvider(shop);
  if (provider === "native") return isNativeLiveEnabled();
  return Boolean(shop.live_url?.trim() || shop.twitch_url?.trim());
}

export function getLiveKitUrl(): string {
  const url =
    process.env.LIVEKIT_URL?.trim() ||
    process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim() ||
    "";
  if (!url) {
    throw new Error("Missing LIVEKIT_URL or NEXT_PUBLIC_LIVEKIT_URL.");
  }
  return url;
}

export function getPublicLiveKitUrl(): string {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim() || process.env.LIVEKIT_URL?.trim();
  if (!url) return "";
  return url;
}
