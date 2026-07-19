import { NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

export const GET = withLogger("credits.get", async () => {
  const { supabase, user } = await requireUser();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("credits_balance, plan")
    .eq("id", user.id)
    .single();
  if (profileError) throw profileError;

  const { data: transactions, error: txError } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (txError) throw txError;

  return NextResponse.json({
    balance: profile.credits_balance,
    plan: profile.plan,
    transactions,
  });
});
