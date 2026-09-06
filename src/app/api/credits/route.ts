import { NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

export const GET = withLogger("credits.get", async () => {
  const { supabase, user } = await requireUser();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("credits_balance, plan, plan_period_end, plan_grace_end, is_admin")
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
    isAdmin: !!profile.is_admin,
    // planGraceEnd is the hard cutoff — expire-subscriptions (the scheduled Edge Function)
    // downgrades to 'free' once this passes without a renewal payment. planPeriodEnd is what
    // the paid period itself covers; the gap between the two is the 3-day grace window.
    planPeriodEnd: profile.plan_period_end,
    planGraceEnd: profile.plan_grace_end,
    transactions,
  });
});
