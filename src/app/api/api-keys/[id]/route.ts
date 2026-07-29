import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

export const DELETE = withLogger(
  "api-keys.revoke",
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { supabase, user } = await requireUser();
    const { id } = await params;

    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  },
);
