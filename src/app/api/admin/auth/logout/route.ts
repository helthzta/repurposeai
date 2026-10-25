import { NextResponse } from "next/server";
import { ADMIN_COOKIE, signOut } from "@/lib/admin-auth";
import { withLogger } from "@/lib/logger";

export const POST = withLogger("admin.auth.logout", async () => {
  await signOut();
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
});
