import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/app/(auth)/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  if (await getCurrentUser()) redirect(redirectTo || "/dashboard");

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
          <AuthForm mode="signup" redirectTo={redirectTo} />
        </CardContent>
      </Card>
    </div>
  );
}
