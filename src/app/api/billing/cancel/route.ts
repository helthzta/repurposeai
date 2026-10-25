import { NextResponse, type NextRequest } from "next/server";
import { ApiError, requireUser } from "@/lib/auth";
import { withLogger } from "@/lib/logger";
import { createDodoClient } from "@/lib/payments/dodo";
import { GRACE_DAYS } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cancels the current subscription at the end of the paid period (monthly or yearly) — or, with
 * `{ "resume": true }`, undoes a scheduled cancellation before it takes effect.
 *
 * Policy (D-032): no refund and no proration. Plan access and remaining credits continue until
 * plan_period_end; then billing_sweep() moves the account to 'free' and forfeits the credits.
 * Dodo is told first; the local rows are written right away so the UI is correct immediately, and
 * the subscription.updated / subscription.cancelled webhooks then confirm the same state.
 */
export const POST = withLogger(
  "billing.cancel",
  async (req: NextRequest) => {
    const { user } = await requireUser();
    const { resume } = (await req.json().catch(() => ({}))) as { resume?: boolean };
    const admin = createAdminClient();

    const { data: profile, error } = await admin
      .from("profiles")
      .select("plan, credits_balance, plan_period_end, dodo_subscription_id")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    if (profile.plan === "free" || !profile.dodo_subscription_id) {
      throw new ApiError(400, "You don't have an active subscription.");
    }

    await createDodoClient().subscriptions.update(profile.dodo_subscription_id, {
      cancel_at_next_billing_date: !resume,
      ...(resume ? {} : { cancel_reason: "cancelled_by_customer" as const }),
    });

    // Cancelling removes the renewal-retry grace window; resuming restores it.
    if (profile.plan_period_end) {
      const periodEnd = new Date(profile.plan_period_end).getTime();
      const graceEnd = resume ? periodEnd + GRACE_DAYS * 24 * 60 * 60 * 1000 : periodEnd;
      await admin
        .from("profiles")
        .update({ plan_grace_end: new Date(graceEnd).toISOString() })
        .eq("id", user.id);
    }
    await admin
      .from("subscriptions")
      .update({ cancel_at_period_end: !resume })
      .eq("id", profile.dodo_subscription_id);

    // Zero-amount ledger row so it shows in the user's activity and the admin Cancellations view.
    const { error: ledgerError } = await admin.from("credit_transactions").insert({
      user_id: user.id,
      amount: 0,
      reason: resume ? "subscription_resumed" : "subscription_cancelled",
      balance_after: profile.credits_balance,
    });
    if (ledgerError) throw ledgerError;

    return NextResponse.json({
      success: true,
      cancelAtPeriodEnd: !resume,
      accessUntil: profile.plan_period_end,
    });
  },
  { rateLimit: { limit: 10, windowMs: 60_000 } },
);
