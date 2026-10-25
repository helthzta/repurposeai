import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin auth is entirely separate from Supabase Auth: own table (admin_users, migration 0007), own
// login page, own cookie. A normal user session grants nothing here, and an admin has no user
// account. Every admin page calls requireAdminPage() and every admin API calls requireAdmin() —
// the middleware's cookie-presence check is only a redirect convenience, never the authorisation.

export const ADMIN_COOKIE = "adiy_admin_session";
const SESSION_HOURS = 8;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

// Verified against for unknown emails so "no such admin" and "wrong password" take the same time.
let dummyHash: Promise<string> | null = null;

export async function audit(
  action: string,
  details: {
    adminId?: string | null;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
    ip?: string;
  } = {},
) {
  await createAdminClient()
    .from("admin_audit_log")
    .insert({
      admin_id: details.adminId ?? null,
      action,
      target_type: details.targetType ?? null,
      target_id: details.targetId ?? null,
      metadata: details.metadata ?? null,
      ip: details.ip ?? null,
    });
}

/** Checks credentials with per-account lockout; on success returns a new session token. */
export async function signIn(
  email: string,
  password: string,
  ip: string,
  userAgent: string | null,
) {
  const db = createAdminClient();
  const normalized = email.trim().toLowerCase();
  const { data: admin } = await db
    .from("admin_users")
    .select("id, password_hash, failed_attempts, locked_until")
    .eq("email", normalized)
    .maybeSingle();

  if (!admin) {
    dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
    await verifyPassword(password, await dummyHash);
    await audit("login.failed", { ip, metadata: { email: normalized, reason: "unknown_email" } });
    return null;
  }

  if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
    await audit("login.blocked", { adminId: admin.id, ip });
    throw new ApiError(429, "Too many failed attempts. Try again in a few minutes.");
  }

  if (!(await verifyPassword(password, admin.password_hash))) {
    const attempts = admin.failed_attempts + 1;
    const locked = attempts >= MAX_FAILED_ATTEMPTS;
    await db
      .from("admin_users")
      .update({
        failed_attempts: locked ? 0 : attempts,
        locked_until: locked ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString() : null,
      })
      .eq("id", admin.id);
    await audit(locked ? "login.locked" : "login.failed", { adminId: admin.id, ip });
    return null;
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3_600_000);
  await db.from("admin_sessions").insert({
    admin_id: admin.id,
    token_hash: sha256(token),
    ip,
    user_agent: userAgent,
    expires_at: expiresAt.toISOString(),
  });
  await db
    .from("admin_users")
    .update({ failed_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() })
    .eq("id", admin.id);
  await audit("login.success", { adminId: admin.id, ip });
  return { token, expiresAt };
}

export const sessionCookieOptions = (expires: Date) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  expires,
});

async function currentAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const db = createAdminClient();
  const { data: session } = await db
    .from("admin_sessions")
    .select("id, expires_at, revoked_at, admin_users(id, email, name)")
    .eq("token_hash", sha256(token))
    .maybeSingle();
  if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) return null;
  const admin = session.admin_users as unknown as { id: string; email: string; name: string };
  return { ...admin, sessionId: session.id as string };
}

/**
 * For admin API routes. Mutating requests must also come from this origin — the cookie is
 * SameSite=Strict already; this is the second, header-based CSRF check.
 */
export async function requireAdmin(req?: Request) {
  if (req && req.method !== "GET") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) {
      throw new ApiError(403, "Cross-origin admin request rejected");
    }
  }
  const admin = await currentAdmin();
  if (!admin) throw new ApiError(401, "Admin session required");
  return { admin, db: createAdminClient() };
}

/** For admin pages: same check, redirecting to the admin login instead of throwing. */
export async function requireAdminPage() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return { admin, db: createAdminClient() };
}

export async function signOut() {
  const admin = await currentAdmin();
  if (!admin) return;
  await createAdminClient()
    .from("admin_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", admin.sessionId);
  const h = await headers();
  await audit("logout", { adminId: admin.id, ip: h.get("x-forwarded-for")?.split(",")[0].trim() });
}
