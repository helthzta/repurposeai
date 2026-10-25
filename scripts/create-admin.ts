/**
 * Creates (or resets the password of) an admin console account and prints a generated password
 * once — it is stored only as a scrypt hash.
 *
 *   npm run create:admin -- admin@adiy.ai "Adiy Admin"
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env / .env.local.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { hashPassword } from "../src/lib/password";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && process.env[m[1]] === undefined)
      process.env[m[1]] = (m[2] ?? "").replace(/^["']|["']$/g, "");
  }
}

async function main() {
  const [email, name = "Admin"] = process.argv.slice(2);
  if (!email?.includes("@")) {
    console.error('Usage: npm run create:admin -- <email> ["Display name"]');
    process.exit(1);
  }
  // 18 random bytes → 24 base64url characters (~144 bits).
  const password = randomBytes(18).toString("base64url");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error } = await db.from("admin_users").upsert(
    {
      email: email.toLowerCase(),
      name,
      password_hash: await hashPassword(password),
      failed_attempts: 0,
      locked_until: null,
    },
    { onConflict: "email" },
  );
  if (error) throw error;
  console.log(
    `Admin ready — sign in at /admin/login\n  email:    ${email.toLowerCase()}\n  password: ${password}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
