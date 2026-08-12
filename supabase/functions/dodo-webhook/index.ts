// Dodo Payments webhook receiver — deployed as a Supabase Edge Function (not a Next.js route)
// specifically so it has a stable public URL independent of the Next.js app's own deploy/hosting
// status (still unresolved, see architecture.md D-007). Register this function's URL as the
// webhook endpoint in the Dodo dashboard: Developer → Webhooks → Add endpoint, subscribed to at
// least `payment.succeeded` (and `payment.failed` if you want failure visibility in error_logs).
//
// This app deliberately does NOT use Dodo's native Subscription object — Starter/Pro are
// one-time-payment products, and this function is the sole source of truth for entitlement
// (profiles.plan/plan_period_end/plan_grace_end), stamping a 30-day period + 3-day grace window
// on every payment.succeeded. A separate scheduled function (expire-subscriptions) downgrades
// anyone who lets their grace window lapse without a new payment.
//
// Keep PLAN_CREDITS/PLAN_PRICE_CENTS in sync with src/lib/payments/plans.ts's PLAN_CONFIG by
// hand — this runs on Deno, a genuinely separate runtime/deploy from the Next.js app, so it can't
// import that file directly.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.3";
import DodoPayments from "npm:dodopayments@2.45.1";

const PLAN_CREDITS: Record<string, number> = { starter: 350, pro: 700 };
const PLAN_PRICE_CENTS: Record<string, number> = { starter: 1900, pro: 3900 };
const PERIOD_DAYS = 30;
const GRACE_DAYS = 3;

function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

/** Best-effort audit trail for anything this function can't safely act on — mirrors the shape
 * of src/lib/errors.ts's logError() so these show up in the same admin-visible error_logs table
 * the rest of the app already uses, not a separate silo. */
async function logUnresolved(
  supabase: ReturnType<typeof admin>,
  message: string,
  payload: unknown,
) {
  console.error("[dodo-webhook]", message, JSON.stringify(payload));
  await supabase.from("error_logs").insert({
    scope: "dodo-webhook",
    message,
    metadata: { payload },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawBody = await req.text();
  const webhookKey = Deno.env.get("DODO_PAYMENTS_WEBHOOK_KEY");
  if (!webhookKey) {
    console.error("[dodo-webhook] DODO_PAYMENTS_WEBHOOK_KEY not set");
    return new Response("Not configured", { status: 500 });
  }

  const dodo = new DodoPayments({ webhookKey });
  let event;
  try {
    event = dodo.webhooks.unwrap(rawBody, {
      headers: {
        "webhook-id": req.headers.get("webhook-id") ?? "",
        "webhook-signature": req.headers.get("webhook-signature") ?? "",
        "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
      },
    });
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  const supabase = admin();
  const webhookId = req.headers.get("webhook-id") ?? "";

  // Idempotency: Dodo retries up to 8 times on anything but a 2xx. Insert-or-skip on the
  // webhook-id before doing any real work so a retried delivery can never double-grant credits.
  const { error: dedupeError } = await supabase
    .from("dodo_webhook_events")
    .insert({ id: webhookId, type: event.type });
  if (dedupeError) {
    // 23505 = unique_violation — already processed this exact webhook-id, ack and stop.
    if (dedupeError.code === "23505") return new Response(JSON.stringify({ received: true }));
    console.error("[dodo-webhook] failed to record idempotency row", dedupeError);
    return new Response("Internal error", { status: 500 });
  }

  if (event.type === "payment.failed") {
    // No entitlement change — a failed one-off charge just means they didn't renew. The grace
    // period (already granted by their last successful payment, if any) still runs its course.
    console.log("[dodo-webhook] payment.failed", event.data.payment_id);
    return new Response(JSON.stringify({ received: true }));
  }

  if (event.type !== "payment.succeeded") {
    // Forward-compatible: log and no-op on anything not explicitly handled above, rather than
    // erroring on an event type this function predates.
    console.log("[dodo-webhook] unhandled event type", event.type);
    return new Response(JSON.stringify({ received: true }));
  }

  const payment = event.data;
  if (payment.status !== "succeeded") {
    await logUnresolved(supabase, "payment.succeeded event with non-succeeded status", payment);
    return new Response(JSON.stringify({ received: true }));
  }

  // Plan resolution, most to least trustworthy: metadata we set ourselves at checkout time,
  // then the actual purchased product, then (last resort) the charged amount.
  const metadataPlan = (payment.metadata as Record<string, unknown> | null)?.plan;
  const productId = payment.product_cart?.[0]?.product_id;
  const plan =
    (metadataPlan === "starter" || metadataPlan === "pro" ? metadataPlan : null) ??
    (productId && productId === Deno.env.get("DODO_STARTER_PRODUCT_ID") ? "starter" : null) ??
    (productId && productId === Deno.env.get("DODO_PRO_PRODUCT_ID") ? "pro" : null) ??
    (payment.total_amount === PLAN_PRICE_CENTS.starter ? "starter" : null) ??
    (payment.total_amount === PLAN_PRICE_CENTS.pro ? "pro" : null);

  const userId = (payment.metadata as Record<string, unknown> | null)?.userId as string | undefined;

  let resolvedUserId = typeof userId === "string" ? userId : null;
  if (!resolvedUserId && payment.customer?.customer_id) {
    // Fallback for the rare case metadata didn't round-trip: match by the Dodo customer id we
    // stamped onto profiles from a previous successful payment. Won't help on a customer's very
    // first payment if metadata is ever missing — that case is unrecoverable automatically and
    // falls through to logUnresolved below.
    const { data: match } = await supabase
      .from("profiles")
      .select("id")
      .eq("dodo_customer_id", payment.customer.customer_id)
      .maybeSingle();
    resolvedUserId = match?.id ?? null;
  }

  if (!plan || !resolvedUserId) {
    await logUnresolved(supabase, "Could not resolve plan/user for payment.succeeded", payment);
    return new Response(JSON.stringify({ received: true }));
  }

  const periodStart = new Date();
  const periodEnd = new Date(periodStart.getTime() + PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const graceEnd = new Date(periodEnd.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);

  const { data: paymentRow, error: insertError } = await supabase
    .from("payments")
    .insert({
      user_id: resolvedUserId,
      plan,
      dodo_payment_id: payment.payment_id,
      dodo_customer_id: payment.customer?.customer_id ?? null,
      amount_cents: payment.total_amount,
      currency: payment.currency,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      grace_end: graceEnd.toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    // 23505 on dodo_payment_id's unique constraint — this exact payment was already recorded
    // under a different webhook-id (belt-and-suspenders beyond the dedupe above). Already
    // credited, nothing more to do.
    if (insertError.code === "23505") return new Response(JSON.stringify({ received: true }));
    console.error("[dodo-webhook] failed to insert payments row", insertError);
    return new Response("Internal error", { status: 500 });
  }

  // Reset (not top up) to exactly the plan's allotment — D-022/D-026 decision. Read current
  // balance, then call spend_credits with a signed delta so it lands on exactly PLAN_CREDITS,
  // going through the one sanctioned credit-mutation path (security definer, same as
  // src/lib/credits.ts's spendCredits/refundCredits) rather than writing credits_balance directly.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("credits_balance")
    .eq("id", resolvedUserId)
    .single();
  if (profileError) {
    console.error("[dodo-webhook] failed to read profile", profileError);
    return new Response("Internal error", { status: 500 });
  }

  const delta = PLAN_CREDITS[plan] - profile.credits_balance;
  if (delta !== 0) {
    const { error: spendError } = await supabase.rpc("spend_credits", {
      p_user_id: resolvedUserId,
      p_amount: delta,
      p_reason: "plan_renewal",
      p_reference_type: "payment",
      p_reference_id: paymentRow.id,
    });
    if (spendError) {
      console.error("[dodo-webhook] failed to reset credits", spendError);
      return new Response("Internal error", { status: 500 });
    }
  }

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      plan,
      plan_period_end: periodEnd.toISOString(),
      plan_grace_end: graceEnd.toISOString(),
      dodo_customer_id: payment.customer?.customer_id ?? undefined,
    })
    .eq("id", resolvedUserId);
  if (profileUpdateError) {
    console.error("[dodo-webhook] failed to update profile plan", profileUpdateError);
    return new Response("Internal error", { status: 500 });
  }

  console.log("[dodo-webhook] granted", plan, "to", resolvedUserId);
  return new Response(JSON.stringify({ received: true }));
});
