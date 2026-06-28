"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Send, VolumeX } from "lucide-react";
import { useShopRoom, useShopEvent } from "@/components/shop-room";
import { sendChatMessage, muteUser } from "@/app/shop/chat-actions";
import { ROOM_EVENTS, type ChatBroadcast, type SystemBroadcast } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, deriveShopStatus } from "@/lib/utils";
import { useShopOpen } from "@/hooks/use-shop-open";

type ChatItem =
  | { kind: "chat"; data: ChatBroadcast }
  | { kind: "system"; id: string; text: string };

const QUICK_EMOJI = ["🔥", "❤️", "😍", "🎉", "👏", "💯"];

export function ShopChat({
  initialMessages,
  isOpen,
  startAt,
  endAt,
  className,
}: {
  initialMessages: ChatBroadcast[];
  isOpen: boolean;
  startAt: string;
  endAt: string;
  className?: string;
}) {
  const shopOpen = useShopOpen(startAt, endAt, isOpen);
  const { shopId, currentUser, isOwner, broadcast } = useShopRoom();
  const [items, setItems] = useState<ChatItem[]>(() =>
    initialMessages.map((m) => ({ kind: "chat", data: m })),
  );
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mutedSelf, setMutedSelf] = useState(false);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useShopEvent(ROOM_EVENTS.chat, (payload) => {
    const msg = payload as ChatBroadcast;
    setItems((prev) => {
      if (prev.some((i) => i.kind === "chat" && i.data.id === msg.id)) return prev;
      return [...prev, { kind: "chat", data: msg }];
    });
  });

  useShopEvent(ROOM_EVENTS.system, (payload) => {
    const sys = payload as SystemBroadcast;
    setItems((prev) => {
      let next = prev;
      if (sys.kind === "mute" && sys.targetUserId) {
        next = prev.filter((i) => !(i.kind === "chat" && i.data.user.id === sys.targetUserId));
        if (sys.targetUserId === currentUser?.id) setMutedSelf(true);
      }
      return [...next, { kind: "system", id: crypto.randomUUID(), text: sys.text }];
    });
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = text.trim();
    if (!value) return;
    setText("");
    startTransition(async () => {
      const res = await sendChatMessage(shopId, value);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setItems((prev) =>
        prev.some((i) => i.kind === "chat" && i.data.id === res.message.id)
          ? prev
          : [...prev, { kind: "chat", data: res.message }],
      );
      broadcast(ROOM_EVENTS.chat, res.message);
    });
  }

  function handleMute(userId: string, username: string) {
    startTransition(async () => {
      const res = await muteUser(shopId, userId);
      if (res.ok) {
        const sys: SystemBroadcast = {
          text: `@${res.username ?? username} was muted by the seller`,
          kind: "mute",
          targetUserId: userId,
        };
        setItems((prev) => [
          ...prev.filter((i) => !(i.kind === "chat" && i.data.user.id === userId)),
          { kind: "system", id: crypto.randomUUID(), text: sys.text },
        ]);
        broadcast(ROOM_EVENTS.system, sys);
      }
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card",
        className ?? "h-[28rem] lg:h-[32rem]",
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <MessageCircle className="size-4 text-primary" />
        <span className="text-sm font-semibold">The Room</span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {items.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet. Say hi! 👋
          </p>
        )}
        {items.map((item) =>
          item.kind === "system" ? (
            <p
              key={item.id}
              className="mx-auto w-fit rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground"
            >
              {item.text}
            </p>
          ) : (
            <ChatLine
              key={item.data.id}
              data={item.data}
              canMute={isOwner && item.data.user.id !== currentUser?.id}
              onMute={() => handleMute(item.data.user.id, item.data.user.username)}
            />
          ),
        )}
      </div>

      <div className="border-t border-border p-3">
        {!shopOpen ? (
          <p className="text-center text-sm text-muted-foreground">
            {deriveShopStatus(startAt, endAt) === "ended"
              ? "This shop has ended."
              : "Chat opens when the shop goes live."}
          </p>
        ) : !currentUser ? (
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Log in to chat</Link>
          </Button>
        ) : mutedSelf ? (
          <p className="text-center text-sm text-live">You have been muted by the seller.</p>
        ) : (
          <>
            <div className="mb-2 flex gap-1">
              {QUICK_EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setText((t) => (t + emoji).slice(0, 500));
                    inputRef.current?.focus();
                  }}
                  className="rounded-md px-1.5 py-0.5 text-lg hover:bg-muted"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Send a message…"
                maxLength={500}
                aria-label="Chat message"
              />
              <Button type="submit" size="icon" disabled={pending || !text.trim()}>
                <Send className="size-4" />
              </Button>
            </form>
            {error && <p className="mt-1 text-xs text-live">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function ChatLine({
  data,
  canMute,
  onMute,
}: {
  data: ChatBroadcast;
  canMute: boolean;
  onMute: () => void;
}) {
  const name = data.user.username;
  return (
    <div className="group flex items-start gap-2">
      {data.user.avatar_url ? (
        <Image
          src={data.user.avatar_url}
          alt={data.user.username}
          width={24}
          height={24}
          className="mt-0.5 h-6 w-6 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <p className="min-w-0 flex-1 text-sm">
        <Link href={`/u/${data.user.username}`} className="font-semibold hover:underline">
          {name}
        </Link>{" "}
        <span className="break-words text-foreground/90">{data.message}</span>
      </p>
      {canMute && (
        <button
          type="button"
          onClick={onMute}
          className={cn(
            "shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-live group-hover:opacity-100",
          )}
          title="Mute this user"
          aria-label={`Mute ${name}`}
        >
          <VolumeX className="size-3.5" />
        </button>
      )}
    </div>
  );
}
