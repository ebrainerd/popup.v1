"use server";

import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { notifySupportTicket } from "@/lib/notifications";

export type SupportTicketState = { error: string | null; success?: boolean };

const ticketSchema = z.object({
  email: z.string().trim().email("Enter a valid email so we can reply.").max(320),
  topic: z.enum(["order", "payment", "shop", "bug", "other"]),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a bit more (at least 10 characters).")
    .max(2000, "Please keep it under 2,000 characters."),
});

export async function submitSupportTicket(
  _prev: SupportTicketState,
  formData: FormData,
): Promise<SupportTicketState> {
  const parsed = ticketSchema.safeParse({
    email: formData.get("email") ?? "",
    topic: formData.get("topic") ?? "other",
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  // Logged-in submitters get linked to their profile; logged-out is fine too
  // (people locked out of their account still need help).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    username = profile?.username ?? null;
  }

  const admin = createServiceRoleClient();

  // Light abuse guard: at most 5 tickets per email per hour.
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("email", parsed.data.email)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= 5) {
    return { error: "You've sent a few tickets recently. Please wait a bit before sending more." };
  }

  const { data: ticket, error } = await admin
    .from("support_tickets")
    .insert({
      user_id: user?.id ?? null,
      email: parsed.data.email,
      topic: parsed.data.topic,
      message: parsed.data.message,
    })
    .select("id")
    .single();
  if (error || !ticket) {
    return { error: "Could not send your ticket right now. Please try again." };
  }

  await notifySupportTicket({
    id: ticket.id,
    email: parsed.data.email,
    topic: parsed.data.topic,
    message: parsed.data.message,
    username,
  });

  return { error: null, success: true };
}
