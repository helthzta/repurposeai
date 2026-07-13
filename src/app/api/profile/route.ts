import { NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { logError } from "@/lib/errors";

const EDITABLE_FIELDS = ["full_name", "theme", "locale", "notify_on_completion"] as const;

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) throw error;

    return NextResponse.json({ profile, email: user.email });
  } catch (error) {
    await logError("profile.get", error);
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const body = await request.json();

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
  } catch (error) {
    await logError("profile.update", error);
    return apiErrorResponse(error);
  }
}
