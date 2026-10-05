import { NextResponse } from "next/server";
import { withLogger } from "@/lib/logger";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cancels the user's current paid plan.
 *
 * Billing is a one-time payment per 30-day period (not a Dodo Subscription), so there is nothing
 * to cancel on Dodo's side and nothing auto-renews. Cancelling moves the account to 'free' right
 * away and clears the period dates; the remaining credits stay. No refund is issued.
 */
export const POST = withLogger("billing.cancel", async () => {
  const { supabase, user } = await requireUser();

  // Verify the user has an active paid plan to cancel
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan, credits_balance")
    .eq("id", user.id)
    .single();
  if (profileError) throw profileError;

  if (profile.plan === "free") {
    return NextResponse.json(
      { error: "You are already on the free plan — nothing to cancel." },
      { status: 400 },
    );
  }

  // Use the service-role client to update billing fields (column-level grants block RLS client)
  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      plan: "free",
      plan_period_end: null,
      plan_grace_end: null,
    })
    .eq("id", user.id);

  if (updateError) throw updateError;

  // Zero-amount ledger row so the cancellation shows in the user's activity and the admin view.
  const { error: ledgerError } = await admin.from("credit_transactions").insert({
    user_id: user.id,
    amount: 0,
    reason: "subscription_cancelled",
    balance_after: profile.credits_balance,
  });
  if (ledgerError) throw ledgerError;

  return NextResponse.json({
    success: true,
    message: "Subscription cancelled. You have been moved to the free plan.",
  });
});
