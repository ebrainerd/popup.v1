#!/usr/bin/env node
/**
 * Wipe all data from the hosted Supabase project using the service-role key.
 * Does not drop/re-run migrations — clears rows, auth users, and storage files.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   I_CONFIRM_NUKE_PRODUCTION=1
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const confirmed = process.env.I_CONFIRM_NUKE_PRODUCTION === "1";

if (!url || !serviceKey) {
  console.error("error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

if (!confirmed) {
  console.error("error: set I_CONFIRM_NUKE_PRODUCTION=1 to run.");
  process.exit(1);
}

const projectRef = url.replace("https://", "").split(".")[0];
console.log(`Nuking Supabase project: ${projectRef}`);

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const NULL_UUID = "00000000-0000-0000-0000-000000000000";

async function deleteAll(table, column = "id") {
  const filterValue = column === "created_at" ? "1970-01-01T00:00:00Z" : NULL_UUID;
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .neq(column, filterValue);
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  cleared ${table}${count != null ? ` (${count} rows)` : ""}`);
}

async function clearPublicTables() {
  console.log("Clearing public tables...");
  const tables = [
    ["auction_bid_events"],
    ["auction_max_bids"],
    ["orders"],
    ["auction_runs"],
    ["drop_reminder_deliveries"],
    ["drop_reminders"],
    ["product_reservations"],
    ["ratings"],
    ["chat_messages"],
    ["shop_announcements"],
    ["shop_mutes", "shop_id"],
    ["products"],
    ["shops"],
    ["shop_follows", "seller_id"],
    ["live_reminders"],
    ["push_subscriptions"],
    ["profiles"],
  ];
  for (const [table, column] of tables) {
    await deleteAll(table, column ?? "id");
  }
}

async function clearAuthUsers() {
  console.log("Clearing auth users...");
  let page = 1;
  let total = 0;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`auth list: ${error.message}`);
    const users = data?.users ?? [];
    if (users.length === 0) break;
    for (const user of users) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (delErr) throw new Error(`delete user ${user.id}: ${delErr.message}`);
      total += 1;
    }
    if (users.length < 200) break;
    page += 1;
  }
  console.log(`  deleted ${total} auth user(s)`);
}

async function listAllFiles(bucket, prefix = "") {
  const paths = [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw new Error(`storage list ${bucket}/${prefix}: ${error.message}`);
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id == null) {
      paths.push(...(await listAllFiles(bucket, path)));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

async function clearStorage() {
  console.log("Clearing storage buckets...");
  const buckets = ["covers", "products", "avatars"];
  for (const bucket of buckets) {
    const files = await listAllFiles(bucket);
    if (files.length === 0) {
      console.log(`  ${bucket}: empty`);
      continue;
    }
    const { error } = await supabase.storage.from(bucket).remove(files);
    if (error) throw new Error(`storage remove ${bucket}: ${error.message}`);
    console.log(`  ${bucket}: removed ${files.length} file(s)`);
  }
}

try {
  await clearPublicTables();
  await clearAuthUsers();
  await clearStorage();
  console.log("\nDone. Production database is empty — sign up again to test onboarding.");
} catch (e) {
  console.error("\nFailed:", e instanceof Error ? e.message : e);
  process.exit(1);
}
