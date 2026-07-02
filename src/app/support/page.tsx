import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { SupportTicketForm } from "@/components/support-ticket-form";

export const metadata: Metadata = {
  title: "Support",
  description: "Having trouble or have a question? Send the PopUp team a ticket.",
};
export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">How can we help?</h1>
      <p className="mt-2 text-muted-foreground">
        Trouble with an order, a payout, your shop, or something that just looks off? Tell us
        what&apos;s going on and we&apos;ll get back to you by email.
      </p>

      <div className="mt-8">
        <SupportTicketForm defaultEmail={user?.email ?? ""} />
      </div>
    </div>
  );
}
