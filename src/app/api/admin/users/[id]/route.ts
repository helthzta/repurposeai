import { NextResponse } from "next/server";
import { ApiError } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { requireAdmin } from "@/lib/admin";

export const GET = withLogger(
  "admin.users.get",
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { admin } = await requireAdmin();
    const { id } = await params;

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) throw new ApiError(404, "User not found");

    const { data: projects, error: projectsError } = await admin
      .from("projects")
      .select("*, generations(*)")
      .eq("user_id", id)
      .order("created_at", { ascending: false });
    if (projectsError) throw projectsError;

    const { data: transactions, error: transactionsError } = await admin
      .from("credit_transactions")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (transactionsError) throw transactionsError;

    return NextResponse.json({ profile, projects, transactions });
  },
);
