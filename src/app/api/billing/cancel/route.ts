import { NextResponse } from "next/server";
import { withLogger } from "@/lib/logger";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cancel the user's current paid plan subscription.
 *
 * Since billing is one-time payment (not a Dodo Subscription), "cancellation" means:
 * - Clear plan_period_end and plan_grace_end so the expire-subscriptions Edge Function
 *   will NOT renew on the next billing cycle check.
 * - The user keeps their current plan + credits until the grace period would have ended
 *   (we immediately downgrade them to 'free' here for clarity).
 *
 * No refund is issued — the current period's payment has already cleared.
 */
export const POST = withLogger("billing.cancel", async () => {
  const { supabase, user } = await requireUser();

  // Verify the user has an active paid plan to cancel
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan, is_admin")
    .eq("id", user.id)
    .single();
  if (profileError) throw profileError;

  if (profile.is_admin) {
    return NextResponse.json(
      { error: "Admin accounts do not have a subscription to cancel." },
      { status: 400 },
    );
  }

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

  // Log the cancellation in credit transactions for auditability
  await admin.from("credit_transactions").insert({
    user_id: user.id,
    amount: 0,
    reason: "subscription_cancelled",
    balance_after: null,
  }).select().maybeSingle();

  return NextResponse.json({ success: true, message: "Subscription cancelled. You have been moved to the free plan." });
});
