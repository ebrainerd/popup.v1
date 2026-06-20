import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already guards /dashboard, but double-check for the profile.
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirectTo=/dashboard");

  return <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>;
}
