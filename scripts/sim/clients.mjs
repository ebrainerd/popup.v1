import { createClient } from "@supabase/supabase-js";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  assertLocalOnly,
} from "./config.mjs";

/**
 * Service-role client (bypasses RLS). Local stack only.
 */
export function createAdmin() {
  assertLocalOnly();
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Anonymous client (RLS as anon). Local stack only.
 */
export function createAnon() {
  assertLocalOnly();
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Sign in and return an authenticated user client.
 */
export async function signIn(email, password) {
  assertLocalOnly();
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`signIn(${email}): ${error.message}`);
  }
  return client;
}
