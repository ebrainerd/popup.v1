import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Complete your profile" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  if (profile?.profile_setup_complete) {
    redirect(redirectTo?.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex justify-center">
        <Logo className="text-2xl" />
      </div>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Complete your profile</CardTitle>
          <CardDescription>
            Pick a public username for chat, orders, and your profile page. Google sign-in users land
            here once; email sign-ups choose a username during registration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm redirectTo={redirectTo} initialUsername={profile?.username} />
        </CardContent>
      </Card>
    </div>
  );
}
