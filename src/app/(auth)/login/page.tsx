import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm, CheckEmailNotice } from "@/app/(auth)/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; checkEmail?: string; error?: string }>;
}) {
  const { redirectTo, checkEmail, error } = await searchParams;
  if (await getCurrentUser()) redirect(redirectTo || "/dashboard");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex justify-center">
        <Logo className="text-2xl" />
      </div>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Log in to manage your shops and orders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {checkEmail && <CheckEmailNotice />}
          {error && (
            <p className="rounded-md bg-live/10 px-3 py-2 text-sm text-live">
              Something went wrong signing you in. Please try again.
            </p>
          )}
          <AuthForm mode="login" redirectTo={redirectTo} />
        </CardContent>
      </Card>
    </div>
  );
}
