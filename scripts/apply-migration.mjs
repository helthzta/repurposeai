#!/usr/bin/env node
/**
 * Run this once to apply the signup bonus migration to your live Supabase project.
 * Usage: node scripts/apply-migration.mjs
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv needed — just parse key=value lines)
const envPath = resolve(__dirname, "../.env");
const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
}

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const SQL = `
-- Re-create the signup bonus function with 50 free credits
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  bonus_credits constant integer := 50;
begin
  insert into public.profiles (id, email, full_name, avatar_url, username)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 8))
  )
  on conflict (id) do nothing;

  if found then
    perform public.spend_credits(new.id, bonus_credits, 'signup_bonus');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
`;

const VERIFY_SQL = `select proname, prosrc from pg_proc where proname = 'handle_new_user' limit 1;`;

async function runSQL(sql, label) {
  const projectRef = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "");
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;

  // Use the Management API endpoint
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  console.log(`\n⏳ ${label}...`);

  const res = await fetch(mgmtUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    // Fallback: try the pg REST endpoint directly
    const fallbackUrl = `${SUPABASE_URL}/pg/query`;
    const fallbackRes = await fetch(fallbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!fallbackRes.ok) {
      const text = await fallbackRes.text();
      throw new Error(`HTTP ${fallbackRes.status}: ${text}`);
    }
    const data = await fallbackRes.json();
    return data;
  }

  return res.json();
}

(async () => {
  try {
    console.log(`🎯 Targeting: ${SUPABASE_URL}`);

    await runSQL(SQL, "Applying handle_new_user function + trigger");
    console.log("✅ Migration applied successfully!");

    console.log("\n📋 Verifying...");
    const result = await runSQL(VERIFY_SQL, "Verifying");
    if (result) {
      console.log("✅ Verified — handle_new_user function is installed.");
      console.log("   New users will receive 50 free credits on signup.");
    }
  } catch (err) {
    console.error("\n❌ Migration failed:", err.message);
    console.log("\n👉 Manual fallback: Copy the SQL below and run it in your Supabase SQL Editor:");
    console.log("   https://supabase.com/dashboard/project/xvtkjkvxjxsbeispjlrh/sql/new");
    console.log("\n" + SQL);
    process.exit(1);
  }
})();
