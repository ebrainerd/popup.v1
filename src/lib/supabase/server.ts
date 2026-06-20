import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 * Reads/writes the auth cookies so the session stays in sync.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` was called from a Server Component where cookies are
          // read-only. The middleware refreshes the session, so this is safe
          // to ignore here.
        }
      },
    },
  });
}

/**
 * Service-role client for privileged server-only operations (webhooks,
 * fund release, admin tasks). NEVER import this into client code.
 */
export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for service-role client.");
  }
  return createServerClient<Database>(getSupabaseUrl(), key, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        /* no-op: service role client is stateless */
      },
    },
  });
}
