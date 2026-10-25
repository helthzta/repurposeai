// dodo-webhook's event handlers, separated from the Deno entry point (index.ts) so
// scripts/test-webhook.ts can drive the exact same code under Node against a real database.
// The Supabase client is passed in; nothing here imports a runtime-specific module.

import {
  creditActionFor,
  entitlementFor,
  nextRefillAt,
  type PlanRow,
  type SubscriptionSnapshot,
} from "./billing.ts";

// A service-role supabase-js client. Typed loosely because Deno (npm:) and Node resolve
// supabase-js separately and their generated client types don't unify.
// deno-lint-ignore no-explicit-any
type Admin = any;

/** Lands in error_logs, the same admin-visible table the app's logError() writes to. */
async function logUnresolved(supabase: Admin, message: string, payload: unknown) {
  console.error("[dodo-webhook]", message, JSON.stringify(payload));
  await supabase
    .from("error_logs")
    .insert({ scope: "dodo-webhook", message, metadata: { payload } });
}

async function planByProduct(supabase: Admin, productId: string | undefined | null) {
  if (!productId) return null;
  const { data } = await supabase
    .from("billing_plans")
    .select("id, plan, billing_interval, credits_per_month")
    .eq("dodo_product_id", productId)
    .maybeSingle();
  return (data as PlanRow | null) ?? null;
}

/** Most to least trustworthy: our own checkout metadata, a known subscription, the Dodo customer. */
async function resolveUserId(
  supabase: Admin,
  metadata: unknown,
  subscriptionId: string | null | undefined,
  customerId: string | null | undefined,
) {
  const fromMetadata = (metadata as Record<string, unknown> | null)?.userId;
  if (typeof fromMetadata === "string") return fromMetadata;
  if (subscriptionId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("id", subscriptionId)
      .maybeSingle();
    if (data) return data.user_id as string;
  }
  if (customerId) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("dodo_customer_id", customerId)
      .maybeSingle();
    if (data) return data.id as string;
  }
  return null;
}

export async function handlePayment(supabase: Admin, type: string, payment: Record<string, any>) {
  const userId = await resolveUserId(
    supabase,
    payment.metadata,
    payment.subscription_id,
    payment.customer?.customer_id,
  );
  let plan = await planByProduct(supabase, payment.product_cart?.[0]?.product_id);
  if (!plan && payment.subscription_id) {
    const { data } = await supabase
      .from("subscriptions")
      .select("billing_plans(id, plan, billing_interval, credits_per_month)")
      .eq("id", payment.subscription_id)
      .maybeSingle();
    plan = (data?.billing_plans as unknown as PlanRow | null) ?? null;
  }
  if (!userId || !plan) {
    await logUnresolved(supabase, `Could not resolve user/plan for ${type}`, payment);
    return;
  }

  const status = type === "payment.succeeded" ? "succeeded" : "failed";
  const { error } = await supabase.from("payments").upsert(
    {
      user_id: userId,
      plan: plan.plan,
      plan_id: plan.id,
      subscription_id: payment.subscription_id ?? null,
      dodo_payment_id: payment.payment_id,
      dodo_customer_id: payment.customer?.customer_id ?? null,
      amount_cents: payment.total_amount,
      currency: payment.currency,
      status,
    },
    { onConflict: "dodo_payment_id" },
  );
  if (error) throw error;

  if (payment.customer?.customer_id) {
    await supabase
      .from("profiles")
      .update({ dodo_customer_id: payment.customer.customer_id })
      .eq("id", userId);
  }
  if (status === "failed") {
    await logUnresolved(supabase, "Payment failed", {
      user_id: userId,
      payment_id: payment.payment_id,
      subscription_id: payment.subscription_id,
      reason: payment.error_message ?? payment.error_code ?? null,
    });
  }
}

export async function handleRefund(supabase: Admin, refund: Record<string, any>) {
  const { error } = await supabase
    .from("payments")
    .update({ status: "refunded" })
    .eq("dodo_payment_id", refund.payment_id);
  if (error) throw error;
}

export async function handleSubscription(supabase: Admin, type: string, sub: Record<string, any>) {
  const snapshot = sub as SubscriptionSnapshot;
  const plan = await planByProduct(supabase, sub.product_id);
  const userId = await resolveUserId(
    supabase,
    sub.metadata,
    sub.subscription_id,
    sub.customer?.customer_id,
  );
  if (!plan || !userId) {
    await logUnresolved(supabase, `Could not resolve user/plan for ${type}`, sub);
    return;
  }

  const { data: stored } = await supabase
    .from("subscriptions")
    .select("plan_id, credited_period_start")
    .eq("id", sub.subscription_id)
    .maybeSingle();
  const storedPlan =
    stored && stored.plan_id !== plan.id
      ? (((
          await supabase
            .from("billing_plans")
            .select("id, plan, billing_interval, credits_per_month")
            .eq("id", stored.plan_id)
            .maybeSingle()
        ).data as PlanRow | null) ?? null)
      : null;

  const action = creditActionFor(type, snapshot, plan, stored, storedPlan);
  const row: Record<string, unknown> = {
    id: sub.subscription_id,
    user_id: userId,
    plan_id: plan.id,
    status: sub.status,
    current_period_start: sub.previous_billing_date,
    current_period_end: sub.next_billing_date,
    cancel_at_period_end: !!sub.cancel_at_next_billing_date,
    cancelled_at: sub.cancelled_at ?? null,
  };
  if (action) {
    row.credited_period_start = action.periodStart;
    row.next_credit_refill_at = nextRefillAt(plan, action.periodStart);
  }
  const { error: upsertError } = await supabase.from("subscriptions").upsert(row);
  if (upsertError) throw upsertError;

  // A late event from an old subscription must not touch a newer one's entitlement.
  const { data: profile } = await supabase
    .from("profiles")
    .select("dodo_subscription_id")
    .eq("id", userId)
    .single();
  const isCurrent =
    !profile?.dodo_subscription_id || profile.dodo_subscription_id === sub.subscription_id;
  const becomesCurrent = sub.status === "active";
  if (!isCurrent && !becomesCurrent) return;

  const entitlement = entitlementFor(snapshot, plan);
  if (entitlement) {
    const { error } = await supabase
      .from("profiles")
      .update({
        ...entitlement,
        dodo_subscription_id: sub.subscription_id,
        dodo_customer_id: sub.customer?.customer_id ?? undefined,
      })
      .eq("id", userId);
    if (error) throw error;
  }

  if (action?.kind === "reset") {
    const { error } = await supabase.rpc("reset_credits", {
      p_user_id: userId,
      p_target: action.target,
      p_reason: type === "subscription.renewed" ? "plan_renewal" : "plan_activated",
      p_reference_type: "subscription",
      p_reference_id: null,
    });
    if (error) throw error;
  } else if (action?.kind === "delta") {
    const { error } = await supabase.rpc("spend_credits", {
      p_user_id: userId,
      p_amount: action.amount,
      p_reason: "plan_changed",
      p_reference_type: "subscription",
      p_reference_id: null,
    });
    // A downgrade can remove more than is left — floor the balance at zero instead of failing.
    if (error?.message.includes("insufficient_credits")) {
      const { error: resetError } = await supabase.rpc("reset_credits", {
        p_user_id: userId,
        p_target: 0,
        p_reason: "plan_changed",
        p_reference_type: "subscription",
        p_reference_id: null,
      });
      if (resetError) throw resetError;
    } else if (error) {
      throw error;
    }
  }

  if (type === "subscription.on_hold" || type === "subscription.failed") {
    await logUnresolved(supabase, `Subscription ${sub.status}`, {
      user_id: userId,
      subscription_id: sub.subscription_id,
    });
  }
}
