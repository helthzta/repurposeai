import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/** Session-cookie auth for the dashboard's own fetch calls. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new ApiError(401, "Not authenticated");

  return { supabase, user };
}

/** Bearer-token auth for the public /api/v1 surface — no UI surface anymore, but the routes still work. */
export async function requireApiKey(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (!token) throw new ApiError(401, "Missing Authorization: Bearer <api key>");

  const keyHash = createHash("sha256").update(token).digest("hex");
  const admin = createAdminClient();

  const { data: apiKey } = await admin
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (!apiKey || apiKey.revoked_at) throw new ApiError(401, "Invalid or revoked API key");

  await admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id);

  return { admin, userId: apiKey.user_id as string };
}
