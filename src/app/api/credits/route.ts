import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";

export const GET = withLogger("credits.get", async () => {
  const { supabase, user } = await requireUser();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("credits_balance, plan, plan_period_end, plan_grace_end, dodo_subscription_id")
    .eq("id", user.id)
    .single();
  if (profileError) throw profileError;

  const [{ data: subscription }, { data: transactions, error: txError }] = await Promise.all([
    profile.dodo_subscription_id
      ? supabase
          .from("subscriptions")
          .select("plan_id, status, cancel_at_period_end, current_period_end")
          .eq("id", profile.dodo_subscription_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (txError) throw txError;

  return NextResponse.json({
    balance: profile.credits_balance,
    plan: profile.plan,
    // planPeriodEnd is what's paid for; planGraceEnd is the hard cutoff billing_sweep() acts on
    // (equal to planPeriodEnd once a cancellation is scheduled).
    planPeriodEnd: profile.plan_period_end,
    planGraceEnd: profile.plan_grace_end,
    subscription: profile.plan === "free" ? null : subscription,
    transactions,
  });
});
