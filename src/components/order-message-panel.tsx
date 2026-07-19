"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  LifeBuoy,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldAlert,
} from "lucide-react";
import {
  escalateOrderHelp,
  getOrderConversation,
  markOrderConversationResolved,
  openOrderHelp,
  reopenOrderConversation,
  sendOrderMessage,
  type OrderConversation,
} from "@/app/orders/actions";
import {
  ORDER_HELP_REASONS,
  ORDER_MESSAGE_MAX_LENGTH,
  canEscalateHelpRequest,
  orderHelpReasonLabel,
} from "@/lib/order-conversation";
import type { OrderHelpReason } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Expandable per-order message thread. Lives inline under the order card/row
 * on the buyer orders page and the seller sales views — no separate route.
 */
export function OrderMessagePanel({
  orderId,
  counterpartName,
}: {
  orderId: string;
  /** Display name of the other party (e.g. "@seller" / "@buyer"). */
  counterpartName: string;
}) {
  const [open, setOpen] = useState(false);
  const [showHelpForm, setShowHelpForm] = useState(false);
  const [conversation, setConversation] = useState<OrderConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [draft, setDraft] = useState("");
  const [helpReason, setHelpReason] = useState<OrderHelpReason>("shipping");
  const [helpMessage, setHelpMessage] = useState("");

  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getOrderConversation(orderId);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setConversation(res);
  }, [orderId]);

  useEffect(() => {
    // Keep the newest message in view when the thread updates.
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [conversation?.messages.length]);

  function toggle(withHelpForm: boolean) {
    if (open && withHelpForm === showHelpForm) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setShowHelpForm(withHelpForm);
    if (!conversation) void load();
  }

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      await load();
    });
  }

  function send() {
    const body = draft.trim();
    if (!body) return;
    runAction(async () => {
      const res = await sendOrderMessage(orderId, body);
      if (res.ok) setDraft("");
      return res;
    });
  }

  function submitHelp() {
    const message = helpMessage.trim();
    if (!message) return;
    runAction(async () => {
      const res = await openOrderHelp(orderId, helpReason, message);
      if (res.ok) {
        setHelpMessage("");
        setShowHelpForm(false);
      }
      return res;
    });
  }

  const helpRequest = conversation?.helpRequest ?? null;
  const helpOpen = helpRequest?.status === "open";
  const archived = conversation?.archived ?? false;
  const messageCount = conversation?.messages.length;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => toggle(false)}
          aria-expanded={open && !showHelpForm}
        >
          <MessageSquare className="size-4" />
          Messages
          {typeof messageCount === "number" && messageCount > 0 && (
            <span className="rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
              {messageCount}
            </span>
          )}
          {open && !showHelpForm ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </Button>
        {!helpOpen && !archived && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toggle(true)}
            aria-expanded={open && showHelpForm}
          >
            <LifeBuoy className="size-4" />
            Need help with this order
          </Button>
        )}
        {helpOpen && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <LifeBuoy className="size-3.5" />
            Help request open · {orderHelpReasonLabel(helpRequest.reason)}
          </span>
        )}
        {archived && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            <CheckCircle2 className="size-3.5" />
            Resolved
          </span>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-3 rounded-md border border-border bg-background/60 p-3">
          {loading && !conversation ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading conversation…</p>
          ) : (
            <>
              {/* Thread */}
              {conversation && conversation.messages.length > 0 ? (
                <div ref={listRef} className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {conversation.messages.map((m) => {
                    const mine = m.sender_id === conversation.viewerId;
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                          mine ? "ml-auto bg-primary/10" : "bg-muted/60",
                        )}
                      >
                        <p className="mb-0.5 text-xs text-muted-foreground">
                          {mine ? "You" : m.sender?.username ? `@${m.sender.username}` : counterpartName}
                          {" · "}
                          {new Date(m.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !showHelpForm && (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    No messages yet. Anything about this order — shipping, sizing, a question —
                    starts here.
                  </p>
                )
              )}

              {/* Help request status + escalation (second step) */}
              {helpOpen && (
                <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                  <p className="font-medium">
                    Help request open — {orderHelpReasonLabel(helpRequest.reason)}
                  </p>
                  {helpRequest.escalated_at ? (
                    <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                      <ShieldAlert className="size-3.5" />
                      Escalated to PopUp support — they&apos;ll follow up by email.
                    </p>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <p className="text-muted-foreground">
                        Not getting anywhere with {counterpartName}?
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={pending || !canEscalateHelpRequest(helpRequest)}
                        onClick={() => runAction(() => escalateOrderHelp(orderId))}
                      >
                        <ShieldAlert className="size-3.5" />
                        Escalate to PopUp support
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Need-help form */}
              {showHelpForm && !helpOpen && !archived && (
                <div className="space-y-2 rounded-md border border-border bg-card px-3 py-3">
                  <p className="text-sm font-medium">Need help with this order</p>
                  <p className="text-xs text-muted-foreground">
                    This opens a help request and notifies {counterpartName}. If you can&apos;t
                    work it out together, you can escalate to PopUp support afterwards.
                  </p>
                  <select
                    value={helpReason}
                    onChange={(e) => setHelpReason(e.target.value as OrderHelpReason)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    aria-label="What's the issue?"
                  >
                    {ORDER_HELP_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <Textarea
                    value={helpMessage}
                    onChange={(e) => setHelpMessage(e.target.value)}
                    placeholder="Describe the problem…"
                    rows={3}
                    maxLength={ORDER_MESSAGE_MAX_LENGTH}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={submitHelp}
                      disabled={pending || !helpMessage.trim()}
                    >
                      <LifeBuoy className="size-4" /> Open help request
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHelpForm(false)}
                      disabled={pending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Composer / archived state */}
              {archived ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-success" />
                    Both of you marked this resolved. The conversation is archived.
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={pending}
                    onClick={() => runAction(() => reopenOrderConversation(orderId))}
                  >
                    <RotateCcw className="size-3.5" /> Reopen
                  </Button>
                </div>
              ) : (
                !showHelpForm && (
                  <div className="space-y-2">
                    <div className="flex items-end gap-2">
                      <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={`Message ${counterpartName}…`}
                        rows={2}
                        maxLength={ORDER_MESSAGE_MAX_LENGTH}
                        className="min-h-0 flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={send}
                        disabled={pending || !draft.trim()}
                        aria-label="Send message"
                      >
                        <Send className="size-4" />
                      </Button>
                    </div>
                    {conversation && (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        {conversation.viewerResolved ? (
                          <>
                            <span>
                              You marked this resolved — it archives once {counterpartName} does
                              too.
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={pending}
                              onClick={() => runAction(() => reopenOrderConversation(orderId))}
                            >
                              <RotateCcw className="size-3.5" /> Undo
                            </Button>
                          </>
                        ) : (
                          <>
                            <span>
                              {conversation.otherResolved
                                ? `${counterpartName} marked this resolved.`
                                : "All sorted?"}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={pending}
                              onClick={() =>
                                runAction(() => markOrderConversationResolved(orderId))
                              }
                            >
                              <CheckCircle2 className="size-3.5" /> Mark resolved
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
            </>
          )}
          {error && <p className="text-xs text-live">{error}</p>}
        </div>
      )}
    </div>
  );
}
