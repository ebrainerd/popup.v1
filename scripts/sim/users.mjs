import { SELLER_PASSWORD, BUYER_PASSWORD } from "./config.mjs";
import { createAdmin } from "./clients.mjs";

/** @param {number} n 1-based index */
export function sellerEmail(n) {
  const nn = String(n).padStart(2, "0");
  return `seller-${nn}@sim.popupdrop.local`;
}

/** @param {number} n 1-based index */
export function buyerEmail(n) {
  const nn = String(n).padStart(2, "0");
  return `buyer-${nn}@sim.popupdrop.local`;
}

async function findUserByEmail(admin, email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  return data.users.find((u) => u.email === email) ?? null;
}

/**
 * Idempotently create or refresh a sim user and profile.
 *
 * @param {{ email: string, password?: string, username: string, displayName: string, isSeller?: boolean }} opts
 * @returns {Promise<{ id: string, email: string }>}
 */
export async function ensureUser({
  email,
  password,
  username,
  displayName,
  isSeller = false,
}) {
  const admin = createAdmin();
  const resolvedPassword =
    password ?? (isSeller ? SELLER_PASSWORD : BUYER_PASSWORD);

  let user = await findUserByEmail(admin, email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: resolvedPassword,
      email_confirm: true,
      user_metadata: { username, full_name: displayName },
    });
    if (error || !data.user) {
      throw new Error(`createUser(${email}): ${error?.message ?? "no user"}`);
    }
    user = data.user;
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: resolvedPassword,
    });
    if (error) throw new Error(`updateUser(${email}): ${error.message}`);
  }

  const profilePatch = {
    username,
    display_name: displayName,
    profile_setup_complete: true,
  };

  if (isSeller) {
    Object.assign(profilePatch, {
      seller_terms_accepted_at: new Date().toISOString(),
      stripe_onboarded: true,
    });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update(profilePatch)
    .eq("id", user.id);

  if (profileError) {
    throw new Error(`profiles.update(${email}): ${profileError.message}`);
  }

  return { id: user.id, email };
}
