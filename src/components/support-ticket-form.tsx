"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, LifeBuoy } from "lucide-react";
import { submitSupportTicket, type SupportTicketState } from "@/app/support/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: SupportTicketState = { error: null };

const TOPICS = [
  { value: "order", label: "An order (shipping, refunds, missing item)" },
  { value: "payment", label: "Payments or payouts" },
  { value: "shop", label: "Running my shop" },
  { value: "bug", label: "Something looks broken" },
  { value: "other", label: "Something else" },
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="rounded-full px-6" disabled={pending}>
      {pending ? "Sending…" : "Send ticket"}
    </Button>
  );
}

export function SupportTicketForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, formAction] = useActionState(submitSupportTicket, initialState);

  if (state.success) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 p-6 text-center">
        <CheckCircle2 className="mx-auto size-8 text-success" />
        <h2 className="mt-3 text-lg font-bold">Ticket sent</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Thanks for reaching out. We&apos;ll get back to you by email as soon as we can, usually
          within a day.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="support-email">Your email</Label>
        <Input
          id="support-email"
          name="email"
          type="email"
          required
          maxLength={320}
          defaultValue={defaultEmail}
          placeholder="you@example.com"
        />
        <p className="text-xs text-muted-foreground">We&apos;ll reply here.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="support-topic">What&apos;s this about?</Label>
        <select
          id="support-topic"
          name="topic"
          defaultValue="order"
          className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="support-message">What happened?</Label>
        <Textarea
          id="support-message"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          placeholder="Include as much detail as you can — shop link, order number, what you expected, and what happened instead."
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">{state.error}</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <LifeBuoy className="size-3.5" /> You can also email support@popupdrop.co
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}
