import type { Metadata } from "next";
import { SignupForm } from "@/app/(auth)/signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  // Do not redirect logged-in users here — after email signup the optional avatar
  // step runs on this page. Middleware sends incomplete OAuth profiles to /onboarding.

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex justify-center">
        <Logo className="text-2xl" />
      </div>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Start selling on PopUp</CardTitle>
          <CardDescription>
            Create your account to launch time-boxed drops in minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm redirectTo={redirectTo} />
        </CardContent>
      </Card>
    </div>
  );
}
