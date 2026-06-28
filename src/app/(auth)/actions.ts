"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";
import { validateUsername } from "@/lib/username";
import { isUsernameAvailable } from "@/lib/profile";

export type AuthState = {
  error: string | null;
  ok?: boolean;
  needsEmailConfirm?: boolean;
};

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

function safeRedirectPath(input: FormDataEntryValue | null): string {
  const value = typeof input === "string" ? input : "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/dashboard";
}

function captchaTokenFromForm(formData: FormData): string | undefined {
  const token =
    (formData.get("captchaToken") as string) ||
    (formData.get("cf-turnstile-response") as string) ||
    "";
  return token.trim() || undefined;
}

function captchaErrorMessage(error: { message: string }, fallback: string): string {
  if (
    error.message.toLowerCase().includes("captcha") &&
    !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  ) {
    return fallback;
  }
  return error.message;
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
  const captchaToken = captchaTokenFromForm(formData);
  const { error } = await supabase.auth.signInWithPassword({
    ...parsed.data,
    options: { captchaToken },
  });
  if (error) {
    return {
      error: captchaErrorMessage(
        error,
        "Log in is temporarily unavailable. Try Continue with Google, or contact support if this persists.",
      ),
    };
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

  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (parsed.data.password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const usernameInput = String(formData.get("username") ?? "");
  const usernameResult = validateUsername(usernameInput);
  if (!usernameResult.ok) {
    return { error: usernameResult.error };
  }

  const available = await isUsernameAvailable(usernameResult.username);
  if (!available) {
    return { error: "That username is already taken." };
  }

  const captchaToken = captchaTokenFromForm(formData);
  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
    return { error: "Complete the captcha verification before continuing." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      captchaToken,
      data: { username: usernameResult.username },
    },
  });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("username_taken") || message.includes("duplicate")) {
      return { error: "That username is already taken." };
    }
    return {
      error: captchaErrorMessage(
        error,
        "Sign-up is temporarily unavailable. Try Continue with Google, or contact support if this persists.",
      ),
    };
  }

  if (!data.session) {
    return { error: null, needsEmailConfirm: true };
  }

  return { error: null, ok: true };
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
