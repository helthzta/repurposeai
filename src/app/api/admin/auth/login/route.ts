import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/auth";
import { ADMIN_COOKIE, sessionCookieOptions, signIn } from "@/lib/admin-auth";
import { withLogger } from "@/lib/logger";
import { clientIp } from "@/lib/rate-limit";

/** Admin sign-in. 5 attempts / 15 min per IP here, plus a 5-strike per-account lockout in signIn(). */
export const POST = withLogger(
  "admin.auth.login",
  async (req: NextRequest) => {
    const { email, password } = (await req.json().catch(() => ({}))) as {
      email?: unknown;
      password?: unknown;
    };
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      throw new ApiError(400, "Email and password are required");
    }
    if (password.length > 256) throw new ApiError(400, "Invalid credentials");

    const session = await signIn(email, password, clientIp(req), req.headers.get("user-agent"));
    if (!session) throw new ApiError(401, "Invalid email or password");

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
    return res;
  },
  { rateLimit: { limit: 5, windowMs: 15 * 60_000 } },
);
