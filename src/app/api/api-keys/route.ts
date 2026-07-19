import { type NextRequest, NextResponse } from "next/server";
import { ApiError, apiErrorResponse, requireUser } from "@/lib/auth";
import { generateApiKey } from "@/lib/api-keys";
import { withLogger } from "@/lib/logger";

export const GET = withLogger("api-keys.list", async () => {
  const { supabase, user } = await requireUser();
  const { data: apiKeys, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, last_used_at, revoked_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return NextResponse.json({ apiKeys });
});

export const POST = withLogger("api-keys.create", async (req: NextRequest) => {
  const { supabase, user } = await requireUser();
  const { name } = await req.json();
  if (!name) throw new ApiError(400, "name is required");

  const { plain, prefix, hash } = generateApiKey();

  const { data: apiKey, error } = await supabase
    .from("api_keys")
    .insert({ user_id: user.id, name, key_prefix: prefix, key_hash: hash })
    .select("id, name, key_prefix, created_at")
    .single();
  if (error) throw error;

  return NextResponse.json({ apiKey, plainKey: plain }, { status: 201 });
});
