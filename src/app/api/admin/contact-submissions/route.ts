import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { withLogger } from "@/lib/logger";

export const GET = withLogger("admin.contact-submissions.list", async () => {
  const { admin } = await requireAdmin();

  const { data: submissions, error } = await admin
    .from("contact_submissions")
    .select("id, name, email, plan_interest, message, status, created_at, user_id")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return NextResponse.json({ submissions: submissions ?? [] });
});
