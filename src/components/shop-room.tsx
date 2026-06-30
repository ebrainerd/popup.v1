"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  ROOM_EVENTS,
  shopChannel,
  type RoomEvent,
  type ChatSender,
  type PresenceMeta,
} from "@/lib/realtime";

type Listener = (payload: unknown) => void;

type ShopRoomContextValue = {
  shopId: string;
  currentUser: ChatSender | null;
  isOwner: boolean;
  viewerCount: number;
  ready: boolean;
  broadcast: (event: RoomEvent, payload: unknown) => void;
  /** Broadcast to others AND apply locally (Realtime doesn't echo to sender). */
  emit: (event: RoomEvent, payload: unknown) => void;
  on: (event: RoomEvent, cb: Listener) => () => void;
};

const ShopRoomContext = createContext<ShopRoomContextValue | null>(null);

export function useShopRoom(): ShopRoomContextValue {
  const ctx = useContext(ShopRoomContext);
  if (!ctx) throw new Error("useShopRoom must be used inside <ShopRoom>");
  return ctx;
}

/** Same as useShopRoom but returns null outside ShopRoom (e.g. dashboard live controls). */
export function useShopRoomOptional(): ShopRoomContextValue | null {
  return useContext(ShopRoomContext);
}

/** Subscribe a handler to a room broadcast event for the lifetime of a component. */
export function useShopEvent(event: RoomEvent, handler: Listener) {
  const { on } = useShopRoom();
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    return on(event, (payload) => ref.current(payload));
  }, [event, on]);
}

function getViewerId(shopId: string): string {
  if (typeof window === "undefined") return "ssr";
  const key = `popup:viewer:${shopId}`;
  let id = window.sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem(key, id);
  }
  return id;
}

export function ShopRoom({
  shopId,
  currentUser,
  isOwner,
  children,
}: {
  shopId: string;
  currentUser: ChatSender | null;
  isOwner: boolean;
  children: React.ReactNode;
}) {
  const [viewerCount, setViewerCount] = useState(0);
  const [ready, setReady] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const listenersRef = useRef<Map<RoomEvent, Set<Listener>>>(new Map());
  const peakRef = useRef(0);
  const lastBumpRef = useRef(0);

  const on = useCallback((event: RoomEvent, cb: Listener) => {
    const map = listenersRef.current;
    if (!map.has(event)) map.set(event, new Set());
    map.get(event)!.add(cb);
    return () => {
      map.get(event)?.delete(cb);
    };
  }, []);

  const broadcast = useCallback((event: RoomEvent, payload: unknown) => {
    channelRef.current?.send({ type: "broadcast", event, payload });
  }, []);

  // Like broadcast, but also runs local listeners so the sender's own UI
  // updates immediately (Supabase Realtime doesn't echo broadcasts to sender).
  const emit = useCallback((event: RoomEvent, payload: unknown) => {
    listenersRef.current.get(event)?.forEach((cb) => cb(payload));
    channelRef.current?.send({ type: "broadcast", event, payload });
  }, []);

  useEffect(() => {
    let supabase;
    try {
      supabase = createClient();
    } catch {
      return; // Misconfigured backend — render statically without realtime.
    }

    const viewerId = getViewerId(shopId);
    const channel = supabase.channel(shopChannel(shopId), {
      config: { presence: { key: viewerId } },
    });
    channelRef.current = channel;

    // Fan out every known broadcast event to registered listeners.
    Object.values(ROOM_EVENTS).forEach((event) => {
      channel.on("broadcast", { event }, ({ payload }) => {
        listenersRef.current.get(event)?.forEach((cb) => cb(payload));
      });
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceMeta>();
      const count = Object.keys(state).length;
      setViewerCount(count);

      if (count > peakRef.current) {
        peakRef.current = count;
        const now = Date.now();
        if (now - lastBumpRef.current > 8000) {
          lastBumpRef.current = now;
          supabase.rpc("bump_peak_viewers", { p_shop: shopId, p_count: count });
        }
      }
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setReady(true);
        channel.track({
          viewer_id: viewerId,
          username: currentUser?.username ?? null,
          online_at: new Date().toISOString(),
        } satisfies PresenceMeta);
      }
    });

    return () => {
      setReady(false);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
    // currentUser is captured for the presence payload; re-subscribing on every
    // identity change is unnecessary, so we intentionally key only on shopId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const value = useMemo<ShopRoomContextValue>(
    () => ({ shopId, currentUser, isOwner, viewerCount, ready, broadcast, emit, on }),
    [shopId, currentUser, isOwner, viewerCount, ready, broadcast, emit, on],
  );

  return <ShopRoomContext.Provider value={value}>{children}</ShopRoomContext.Provider>;
}
