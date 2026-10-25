// Dodo Payments webhook receiver — a Supabase Edge Function so Dodo has a stable public URL
// independent of the Next.js deploy. Register it in the Dodo dashboard (Developer → Webhooks), or
// let `npm run setup:dodo` do it, subscribed to the payment.* and subscription.* events below.
//
// Billing is Dodo native subscriptions (monthly and yearly, D-032). This function is the only
// writer of entitlement: profiles.plan / plan_period_end / plan_grace_end / dodo_subscription_id,
// the subscriptions mirror, the payments ledger, and plan credit resets. Plan prices and credits come
// from the billing_plans table — the same rows the app reads — so there's no hand-synced copy here.
// Event handling is in ../_shared/webhook.ts and the pure rules it applies in ../_shared/billing.ts.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.3";
import DodoPayments from "npm:dodopayments@2.45.1";
import { handlePayment, handleRefund, handleSubscription } from "../_shared/webhook.ts";

function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

const ok = () => new Response(JSON.stringify({ received: true }));

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawBody = await req.text();
  const webhookKey = Deno.env.get("DODO_PAYMENTS_WEBHOOK_KEY");
  if (!webhookKey) {
    console.error("[dodo-webhook] DODO_PAYMENTS_WEBHOOK_KEY not set");
    return new Response("Not configured", { status: 500 });
  }

  // The SDK constructor throws without a bearerToken even though unwrap() only needs the
  // webhook key; this function never calls the Dodo API, so a placeholder is enough.
  const dodo = new DodoPayments({ bearerToken: "unused", webhookKey });
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

  // Idempotency: Dodo retries on anything but a 2xx. Insert-or-skip on webhook-id first so a
  // retried delivery is never applied twice.
  const { error: dedupeError } = await supabase
    .from("dodo_webhook_events")
    .insert({ id: webhookId, type: event.type });
  if (dedupeError) {
    if (dedupeError.code === "23505") return ok(); // already processed
    console.error("[dodo-webhook] failed to record idempotency row", dedupeError);
    return new Response("Internal error", { status: 500 });
  }

  try {
    const data = event.data as unknown as Record<string, any>;
    if (event.type === "payment.succeeded" || event.type === "payment.failed") {
      await handlePayment(supabase, event.type, data);
    } else if (event.type === "refund.succeeded") {
      await handleRefund(supabase, data);
    } else if (event.type.startsWith("subscription.")) {
      await handleSubscription(supabase, event.type, data);
    } else {
      console.log("[dodo-webhook] unhandled event type", event.type);
    }
  } catch (error) {
    // Drop the idempotency row so Dodo's retry actually re-runs the handler.
    await supabase.from("dodo_webhook_events").delete().eq("id", webhookId);
    console.error("[dodo-webhook] handler failed", event.type, error);
    return new Response("Internal error", { status: 500 });
  }

  return ok();
});
