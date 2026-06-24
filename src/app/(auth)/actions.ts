"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";

export type AuthState = { error: string | null };

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

function safeRedirectPath(input: FormDataEntryValue | null): string {
  const value = typeof input === "string" ? input : "";
  // Only allow internal absolute paths to prevent open redirects.
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/dashboard";
}

export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const captchaToken = (formData.get("cf-turnstile-response") as string) || undefined;
  const { error } = await supabase.auth.signInWithPassword({
    ...parsed.data,
    options: { captchaToken },
  });
  if (error) {
    const message =
      error.message.toLowerCase().includes("captcha") && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
        ? "Log in is temporarily unavailable. Try Continue with Google, or contact support if this persists."
        : error.message;
    return { error: message };
  }

  revalidatePath("/", "layout");
  redirect(safeRedirectPath(formData.get("redirectTo")));
}

export async function signUpWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const captchaToken = (formData.get("cf-turnstile-response") as string) || undefined;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${getSiteUrl()}/auth/callback`, captchaToken },
  });
  if (error) {
    const message =
      error.message.toLowerCase().includes("captcha") && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
        ? "Sign-up is temporarily unavailable. Try Continue with Google, or contact support if this persists."
        : error.message;
    return { error: message };
  }

  // When email confirmation is required, there is no active session yet.
  if (!data.session) {
    redirect("/login?checkEmail=1");
  }

  revalidatePath("/", "layout");
  redirect(safeRedirectPath(formData.get("redirectTo")));
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  if (data.url) redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
