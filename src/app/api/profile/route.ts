import { type NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

const EDITABLE_FIELDS = ["full_name", "theme", "locale", "notify_on_completion"] as const;

export const GET = withLogger("profile.get", async () => {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) throw error;

  return NextResponse.json({ profile, email: user.email });
});

export const PATCH = withLogger("profile.update", async (req: NextRequest) => {
  const { supabase, user } = await requireUser();
  const body = await req.json();

  const patch: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) patch[field] = body[field];
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select()
    .single();
  if (error) throw error;

  return NextResponse.json({ profile });
});
