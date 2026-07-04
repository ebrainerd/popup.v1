"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Bell,
  ChevronDown,
  Megaphone,
  Package,
  ShoppingBag,
  Volume2,
  VolumeX,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useShopRoomOptional } from "@/components/shop-room";
import { ROOM_EVENTS, type SystemBroadcast } from "@/lib/realtime";
import { cn, formatCurrency } from "@/lib/utils";

const LOW_STOCK_THRESHOLD = 3;
const MUTE_KEY = "popup:seller-feed-muted";

type FeedOrder = {
  id: string;
  amount_paid: number;
  status: string;
  created_at: string;
  product: { title: string; photo_url: string | null } | null;
  buyer: { username: string | null; display_name: string | null } | null;
};

const ORDER_SELECT =
  "id, amount_paid, status, created_at, product:products!orders_product_id_fkey(title, photo_url), buyer:profiles!orders_buyer_id_fkey(username, display_name)";

type ProductStock = { id: string; title: string; quantity: number };

/**
 * Backstage live sales feed — visible only to the shop owner while hosting.
 * Streams "who bought what" in real time (RLS keeps buyer identities private),
 * with running totals, a sale chime, low-stock nudges, and one-tap "call it
 * out" hype into the public chat.
 */
export function SellerLiveFeed({
  shopId,
  startAt,
  products,
}: {
  shopId: string;
  startAt: string;
  products: ProductStock[];
}) {
  const room = useShopRoomOptional();
  const [orders, setOrders] = useState<FeedOrder[]>([]);
  const [open, setOpen] = useState(true);
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(MUTE_KEY) === "1";
  });
  const [flashId, setFlashId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Remaining stock, seeded from the server snapshot then decremented on each
  // live sale so low-stock nudges reflect what's actually left right now.
  const [remaining, setRemaining] = useState<Record<string, ProductStock>>(() =>
    Object.fromEntries(products.map((p) => [p.id, p])),
  );

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const playChime = useCallback(() => {
    if (mutedRef.current) return;
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioCtxRef.current ?? new Ctx();
      audioCtxRef.current = ctx;
      const now = ctx.currentTime;
      // Two quick ascending notes — a friendly "cha-ching".
      [880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = now + i * 0.12;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.24);
      });
    } catch {
      /* audio is a nice-to-have; never block the feed */
    }
  }, []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  const ingest = useCallback(
    (order: FeedOrder, isLive: boolean) => {
      if (seenIds.current.has(order.id)) return;
      seenIds.current.add(order.id);
      setOrders((prev) => [order, ...prev].slice(0, 100));
      if (isLive) {
        setFlashId(order.id);
        setTimeout(() => setFlashId((cur) => (cur === order.id ? null : cur)), 2500);
        playChime();
        showToast(`New sale: ${order.product?.title ?? "item"} · ${formatCurrency(order.amount_paid)}`);
      }
    },
    [playChime, showToast],
  );

  // Initial snapshot of this drop's orders.
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("shop_id", shopId)
      .gte("created_at", startAt)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!active || !data) return;
        const rows = data as unknown as FeedOrder[];
        rows.forEach((r) => seenIds.current.add(r.id));
        setOrders(rows);
      });
    return () => {
      active = false;
    };
  }, [shopId, startAt]);

  // Live order inserts (RLS scopes these to the owner). postgres_changes
  // evaluates the orders SELECT policy against the connected user, so the
  // socket must carry the seller's access token — otherwise Realtime treats
  // the connection as anon and (correctly) withholds every order row.
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      channel = supabase
        .channel(`orders-feed:${shopId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders", filter: `shop_id=eq.${shopId}` },
          async (payload) => {
            const row = payload.new as { id: string; product_id?: string };
            if (!row?.id || seenIds.current.has(row.id)) return;
            const { data } = await supabase
              .from("orders")
              .select(ORDER_SELECT)
              .eq("id", row.id)
              .maybeSingle();
            if (!data) return;
            ingest(data as unknown as FeedOrder, true);
            if (row.product_id) {
              setRemaining((prev) => {
                const p = prev[row.product_id!];
                if (!p) return prev;
                return {
                  ...prev,
                  [row.product_id!]: { ...p, quantity: Math.max(0, p.quantity - 1) },
                };
              });
            }
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [shopId, ingest]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const totals = useMemo(() => {
    const gross = orders.reduce((sum, o) => sum + o.amount_paid, 0);
    const needsShipping = orders.filter((o) => o.status === "paid").length;
    return { gross, count: orders.length, needsShipping };
  }, [orders]);

  const lowStock = useMemo(
    () =>
      Object.values(remaining)
        .filter((p) => p.quantity > 0 && p.quantity <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.quantity - b.quantity),
    [remaining],
  );

  function callOut(text: string) {
    if (!room) return;
    const payload: SystemBroadcast = { text, kind: "info" };
    room.emit(ROOM_EVENTS.system, payload);
    showToast("Posted to your shop chat");
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ShoppingBag className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Live sales</p>
            <p className="truncate text-xs text-muted-foreground">
              Only you can see this — buyers never see each other&apos;s orders.
            </p>
          </div>
          <ChevronDown
            className={cn(
              "ml-1 size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute sale sound" : "Mute sale sound"}
          title={muted ? "Sale sound off" : "Sale sound on"}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>

      {/* Running totals — always visible, even when the list is collapsed. */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <Stat label="Sales" value={formatCurrency(totals.gross)} highlight />
        <Stat label="Orders" value={String(totals.count)} />
        <Stat label="To ship" value={String(totals.needsShipping)} />
      </div>

      {open && (
        <div className="space-y-3 p-4">
          {toast && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-foreground">
              <Bell className="size-4 text-primary" />
              {toast}
            </div>
          )}

          {lowStock.length > 0 && (
            <div className="space-y-2 rounded-lg border border-highlight/40 bg-highlight/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Running low
              </p>
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{p.title}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {p.quantity} left
                    </span>
                  </span>
                  {room && (
                    <button
                      type="button"
                      onClick={() =>
                        callOut(`⏳ Only ${p.quantity} ${p.title} left — grab yours before they're gone!`)
                      }
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <Megaphone className="size-3" /> Hype it
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {orders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <ShoppingBag className="size-6" />
              <p className="text-sm">No sales yet. They&apos;ll pop up here the moment someone checks out.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-2.5 transition-colors",
                    flashId === order.id
                      ? "animate-price-pop border-primary bg-primary/10"
                      : "border-border",
                  )}
                >
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {order.product?.photo_url ? (
                      <Image
                        src={order.product.photo_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Package className="size-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {order.product?.title ?? "Item"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {order.buyer?.username ? `@${order.buyer.username}` : "Guest"} ·{" "}
                      {new Date(order.created_at).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">
                    {formatCurrency(order.amount_paid)}
                  </span>
                  {room && (
                    <button
                      type="button"
                      onClick={() =>
                        callOut(`🔥 ${order.product?.title ?? "An item"} just sold! Don't miss the next one.`)
                      }
                      aria-label="Call out this sale in chat"
                      title="Hype this in your shop chat"
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                    >
                      <Megaphone className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-4 py-3 text-center">
      <p className={cn("text-lg font-bold tabular-nums", highlight && "text-primary")}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
