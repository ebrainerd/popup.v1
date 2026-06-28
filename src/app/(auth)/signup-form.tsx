"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signUpWithPassword,
  signInWithGoogle,
  type AuthState,
} from "@/app/(auth)/actions";
import { updateProfileAvatar } from "@/app/onboarding/actions";
import { Turnstile } from "@/components/turnstile";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USERNAME_PERMANENCE_NOTICE } from "@/lib/username";

const initialState: AuthState = { error: null };

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending || disabled}>
      {pending ? "Please wait…" : "Create account"}
    </Button>
  );
}

export function SignupForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [state, formAction] = useActionState(signUpWithPassword, initialState);

  useEffect(() => {
    if (state.needsEmailConfirm) {
      router.replace("/login?checkEmail=1");
    }
  }, [state.needsEmailConfirm, router]);

  async function finishSignup() {
    if (avatarUrl) {
      await updateProfileAvatar(avatarUrl);
    }
    router.push(redirectTo ?? "/dashboard");
    router.refresh();
  }

  if (state.ok) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Add a profile photo?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Optional — you can skip and add one later.</p>
        </div>
        <ImageUpload
          name="avatar_url"
          bucket="avatars"
          aspect="square"
          label="Upload avatar"
          onChange={setAvatarUrl}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => void finishSignup()}>
            Skip for now
          </Button>
          <Button type="button" className="flex-1" onClick={() => void finishSignup()}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  const submitDisabled = turnstileEnabled && !captchaToken;

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
        <input type="hidden" name="captchaToken" value={captchaToken ?? ""} />

        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              @
            </span>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              required
              placeholder="yourname"
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z][a-zA-Z0-9_]*"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            3–20 characters; letters, numbers, and underscores. {USERNAME_PERMANENCE_NOTICE}
          </p>
        </div>

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
            autoComplete="new-password"
            required
            placeholder="••••••••"
            minLength={8}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            minLength={8}
          />
        </div>

        <Turnstile
          onTokenChange={(token) => setCaptchaToken(token)}
          resetKey={state.error ? state.error.length : 0}
        />

        {state.error && (
          <p className="flex items-center gap-2 rounded-md bg-live/10 px-3 py-2 text-sm text-live">
            {state.error}
          </p>
        )}

        <SubmitButton disabled={submitDisabled} />
        {submitDisabled && (
          <p className="text-center text-xs text-muted-foreground">Complete captcha to continue.</p>
        )}
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
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
