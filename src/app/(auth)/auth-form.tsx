"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Mail } from "lucide-react";
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
  type AuthState,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Turnstile } from "@/components/turnstile";

const initialState: AuthState = { error: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? "Please wait…" : label}
    </Button>
  );
}

export function AuthForm({
  mode,
  redirectTo,
}: {
  mode: "login" | "signup";
  redirectTo?: string;
}) {
  const action = mode === "login" ? signInWithPassword : signUpWithPassword;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="space-y-4">
      <form action={signInWithGoogle}>
        <input type="hidden" name="redirectTo" value={redirectTo ?? "/dashboard"} />
        <Button type="submit" variant="outline" size="lg" className="w-full">
          <GoogleIcon />
          Continue with Google
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="redirectTo" value={redirectTo ?? "/dashboard"} />
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            placeholder="••••••••"
            minLength={8}
          />
        </div>

        <Turnstile />

        {state.error && (
          <p className="flex items-center gap-2 rounded-md bg-live/10 px-3 py-2 text-sm text-live">
            {state.error}
          </p>
        )}

        <SubmitButton label={mode === "login" ? "Log in" : "Create account"} />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            New to PopUp?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

export function CheckEmailNotice() {
  return (
    <p className="flex items-center gap-2 rounded-md bg-accent/10 px-3 py-2 text-sm text-accent">
      <Mail className="size-4" />
      Check your email to confirm your account, then log in.
    </p>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
