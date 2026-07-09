import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/app/(auth)/signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { getCurrentProfile } from "@/lib/auth";
import { createShopPath } from "@/lib/auth-routes";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  const profile = await getCurrentProfile();

  // Signed-in users who hit marketing CTAs should not see signup again.
  // The optional post-signup avatar step is client-only on this page.
  if (profile?.profile_setup_complete) {
    const destination =
      redirectTo?.startsWith("/") && !redirectTo.startsWith("//")
        ? redirectTo
        : createShopPath(true);
    redirect(destination);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex justify-center">
        <Logo className="text-2xl" />
      </div>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create your PopUp account</CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">
              Join drops, bid in live auctions, and track your orders.
            </span>
            <span className="block text-xs">
              Want to run a drop? You&apos;ll create your first shop right after signup.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm redirectTo={redirectTo} />
        </CardContent>
      </Card>
    </div>
  );
}
