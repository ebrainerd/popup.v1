import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/database.types";

const ONBOARDING_PATH = "/onboarding";

function isOnboardingExempt(pathname: string): boolean {
  return (
    pathname === ONBOARDING_PATH ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/legal/") ||
    pathname.startsWith("/api/") ||
    pathname === "/" ||
    pathname.startsWith("/sell") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/shop/") ||
    pathname.startsWith("/u/") ||
    pathname.startsWith("/explore") ||
    pathname.startsWith("/search")
  );
}

/**
 * Refreshes the Supabase auth session on every request and guards
 * authenticated-only routes.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith("/dashboard");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && !isOnboardingExempt(pathname)) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("profile_setup_complete")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && profile && !profile.profile_setup_complete) {
      const url = request.nextUrl.clone();
      url.pathname = ONBOARDING_PATH;
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
